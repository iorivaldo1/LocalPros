/**
 * 浅水方程流体模拟着色器模块
 * Shallow Water Equations (SWE) Fluid Simulation Shaders
 */

// 通量计算着色器 - 根据水面高度差计算流动通量
function createFluxShader() {
    return {
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform sampler2D uWaterTex;      // 当前水深场 (r: 水深)
            uniform sampler2D uHeightTex;     // 地形高度场
            uniform sampler2D uFluxTex;       // 上一帧通量
            uniform vec2 uResolution;         // 纹理分辨率
            uniform float uDt;                // 时间步长
            uniform float uGravity;           // 重力加速度
            uniform float uPipeArea;          // 管道横截面积
            uniform float uPipeLength;        // 管道长度
            
            varying vec2 vUv;
            
            void main() {
                vec2 texel = 1.0 / uResolution;
                
                // 获取当前单元格和相邻单元格的水深和地形高度
                float h0 = texture2D(uWaterTex, vUv).r;
                float B0 = texture2D(uHeightTex, vUv).r;
                float surface0 = h0 + B0;  // 总水面高度
                
                // 四个方向: R, L, T, B (右、左、上、下)
                vec2 uvR = vUv + vec2(texel.x, 0.0);
                vec2 uvL = vUv - vec2(texel.x, 0.0);
                vec2 uvT = vUv + vec2(0.0, texel.y);
                vec2 uvB = vUv - vec2(0.0, texel.y);
                
                // 边界检查
                bool validR = uvR.x <= 1.0;
                bool validL = uvL.x >= 0.0;
                bool validT = uvT.y <= 1.0;
                bool validB = uvB.y >= 0.0;
                
                // 相邻水面高度
                float hR = validR ? texture2D(uWaterTex, uvR).r : 0.0;
                float hL = validL ? texture2D(uWaterTex, uvL).r : 0.0;
                float hT = validT ? texture2D(uWaterTex, uvT).r : 0.0;
                float hB = validB ? texture2D(uWaterTex, uvB).r : 0.0;
                
                float BR = validR ? texture2D(uHeightTex, uvR).r : B0;
                float BL = validL ? texture2D(uHeightTex, uvL).r : B0;
                float BT = validT ? texture2D(uHeightTex, uvT).r : B0;
                float BB = validB ? texture2D(uHeightTex, uvB).r : B0;
                
                float surfaceR = hR + BR;
                float surfaceL = hL + BL;
                float surfaceT = hT + BT;
                float surfaceB = hB + BB;
                
                // 获取上一帧通量
                vec4 flux0 = texture2D(uFluxTex, vUv);
                float fR0 = flux0.r;  // 向右通量
                float fL0 = flux0.g;  // 向左通量
                float fT0 = flux0.b;  // 向上通量
                float fB0 = flux0.a;  // 向下通量
                
                // 计算水面高度差驱动的新通量
                float dhR = surface0 - surfaceR;
                float dhL = surface0 - surfaceL;
                float dhT = surface0 - surfaceT;
                float dhB = surface0 - surfaceB;
                
                // 更新通量 (管道模型)
                float A = uPipeArea;
                float L = uPipeLength;
                float g = uGravity;
                
                // 轻微阻尼模拟水的粘性，保持流动性
                float damping = 0.995;
                
                float fR = max(0.0, (fR0 + uDt * A * g * dhR / L) * damping);
                float fL = max(0.0, (fL0 + uDt * A * g * dhL / L) * damping);
                float fT = max(0.0, (fT0 + uDt * A * g * dhT / L) * damping);
                float fB = max(0.0, (fB0 + uDt * A * g * dhB / L) * damping);
                
                // 限制总流出不超过可用水量
                float totalOut = fR + fL + fT + fB;
                float maxOut = h0 * L * L / uDt;  // 最大可流出水量
                
                if (totalOut > maxOut && totalOut > 0.0) {
                    float scale = maxOut / totalOut;
                    fR *= scale;
                    fL *= scale;
                    fT *= scale;
                    fB *= scale;
                }
                
                // 边界处通量为0
                if (!validR) fR = 0.0;
                if (!validL) fL = 0.0;
                if (!validT) fT = 0.0;
                if (!validB) fB = 0.0;
                
                gl_FragColor = vec4(fR, fL, fT, fB);
            }
        `
    };
}

// 水深更新着色器 - 根据通量更新水深
function createWaterShader() {
    return {
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform sampler2D uWaterTex;      // 当前水深场
            uniform sampler2D uFluxTex;       // 通量场
            uniform sampler2D uHeightTex;     // 地形高度场
            uniform vec2 uResolution;         // 纹理分辨率
            uniform float uDt;                // 时间步长
            uniform float uPipeLength;        // 管道长度
            uniform float uEvaporation;       // 蒸发速率 (1.0 不蒸发, <1.0 蒸发)
            
            // 水源注入参数
            uniform bool uInjectActive;       // 是否正在注入
            uniform vec2 uInjectPos;          // 注入位置 (UV坐标)
            uniform float uInjectRadius;      // 注入半径
            uniform float uInjectAmount;      // 注入量
            uniform vec2 uSlopeDir;           // 地形梯度方向(归一化)
            
            varying vec2 vUv;
            
            void main() {
                vec2 texel = 1.0 / uResolution;
                
                // 获取当前水深
                float h0 = texture2D(uWaterTex, vUv).r;
                
                // 获取本单元格的流出通量
                vec4 flux0 = texture2D(uFluxTex, vUv);
                float fOutR = flux0.r;
                float fOutL = flux0.g;
                float fOutT = flux0.b;
                float fOutB = flux0.a;
                
                // 获取相邻单元格流入本单元格的通量
                vec2 uvR = vUv + vec2(texel.x, 0.0);
                vec2 uvL = vUv - vec2(texel.x, 0.0);
                vec2 uvT = vUv + vec2(0.0, texel.y);
                vec2 uvB = vUv - vec2(0.0, texel.y);
                
                // 从右边单元格流入 = 右边单元格的向左通量
                float fInR = uvR.x <= 1.0 ? texture2D(uFluxTex, uvR).g : 0.0;
                // 从左边单元格流入 = 左边单元格的向右通量  
                float fInL = uvL.x >= 0.0 ? texture2D(uFluxTex, uvL).r : 0.0;
                // 从上边单元格流入 = 上边单元格的向下通量
                float fInT = uvT.y <= 1.0 ? texture2D(uFluxTex, uvT).a : 0.0;
                // 从下边单元格流入 = 下边单元格的向上通量
                float fInB = uvB.y >= 0.0 ? texture2D(uFluxTex, uvB).b : 0.0;
                
                // 计算净水量变化
                float L = uPipeLength;
                float dV = (fInR + fInL + fInT + fInB - fOutR - fOutL - fOutT - fOutB) * uDt;
                float dh = dV / (L * L);
                
                float newH = h0 + dh;
                
                // 水源注入 (锥体面形状)
                if (uInjectActive) {
                    vec2 toFrag = vUv - uInjectPos;
                    
                    // 向下坡方向偏移的锥体
                    float slopeOffset = dot(toFrag, uSlopeDir);
                    float perpDist = length(toFrag - slopeOffset * uSlopeDir);
                    
                    // 在下坡方向扩展更多
                    float effectiveRadius = uInjectRadius * (1.0 + max(0.0, slopeOffset) * 2.0);
                    float dist = length(toFrag);
                    
                    // 锥体形状：中心最高，向外衰减
                    float cone = max(0.0, 1.0 - dist / effectiveRadius);
                    
                    newH += cone * uInjectAmount * uDt * 0.1;
                }
                
                // 确保水深非负
                newH = max(0.0, newH);
                
                // 使用参数控制蒸发/渗透来避免无限积水
                newH *= uEvaporation;
                
                // 非常小的水量直接清零
                if (newH < 1e-9) newH = 0.0;
                
                gl_FragColor = vec4(newH, 0.0, 0.0, 1.0);
            }
        `
    };
}

// 水面渲染材质 - 优化边缘平滑
function createWaterRenderMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uWaterTex: { value: null },
            uHeightTex: { value: null },
            uHeightScale: { value: 2.0 },
            uWaterColor: { value: new THREE.Color(0x5d5d30) },  // 污染水体：浅色区呈现浑浊的黄褐色/橄榄色
            uDeepColor: { value: new THREE.Color(0x1a2410) },   // 污染水体：深色区呈现深绿黑色
            uSpecularColor: { value: new THREE.Color(0xcccccc) }, // 降低高光亮度，模拟油脂感
            uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.5) },
            uShininess: { value: 30.0 }, // 降低光泽度，显得更粘稠
            uMaxDepth: { value: 0.1 },
            uResolution: { value: new THREE.Vector2(128, 128) },
            uTerrainSize: { value: 10.0 }
        },
        vertexShader: `
            uniform sampler2D uWaterTex;
            uniform sampler2D uHeightTex;
            uniform float uHeightScale;
            uniform vec2 uResolution;
            
            varying vec2 vUv;
            varying float vWaterDepth;
            varying vec3 vWorldPos;

            
            // 双三次插值采样，获得更平滑的水深值
            float sampleWaterSmooth(sampler2D tex, vec2 uv) {
                vec2 texel = 1.0 / uResolution;
                
                // 使用双线性插值的9点采样
                float c = texture2D(tex, uv).r;
                float l = texture2D(tex, uv - vec2(texel.x, 0.0)).r;
                float r = texture2D(tex, uv + vec2(texel.x, 0.0)).r;
                float t = texture2D(tex, uv + vec2(0.0, texel.y)).r;
                float b = texture2D(tex, uv - vec2(0.0, texel.y)).r;
                float lt = texture2D(tex, uv + vec2(-texel.x, texel.y)).r;
                float rt = texture2D(tex, uv + vec2(texel.x, texel.y)).r;
                float lb = texture2D(tex, uv + vec2(-texel.x, -texel.y)).r;
                float rb = texture2D(tex, uv + vec2(texel.x, -texel.y)).r;
                
                // 高斯加权平均
                float center = c * 0.25;
                float sides = (l + r + t + b) * 0.125;
                float corners = (lt + rt + lb + rb) * 0.0625;
                
                return center + sides + corners;
            }
            
            void main() {
                vUv = uv;
                
                // 翻转 UV 的 Y 坐标以匹配 GeoTIFF 数据方向
                vec2 flippedUV = vec2(uv.x, 1.0 - uv.y);
                
                float terrainH = texture2D(uHeightTex, flippedUV).r;
                
                // 直接采样水深，保留其原始强度
                float waterH = texture2D(uWaterTex, flippedUV).r;
                
                vWaterDepth = waterH;
                
                // 水面位置 = 地形高度 + 水深
                vec3 pos = position;
                // 优化：为水面增加一个动态的基础偏移，确保浅水可见
                // float surfaceOffset = waterH > 0.00001 ? 0.002 : 0.0;
                pos.z = (terrainH + waterH) * uHeightScale;
                
                vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
                vWorldPos = worldPosition.xyz;

                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D uWaterTex;
            uniform sampler2D uHeightTex;
            uniform vec3 uWaterColor;
            uniform vec3 uDeepColor;
            uniform vec3 uSpecularColor;
            uniform vec3 uLightDir;
            uniform float uShininess;
            uniform float uMaxDepth;
            uniform vec2 uResolution;
            uniform float uHeightScale;
            uniform float uTerrainSize;
            
            varying vec2 vUv;
            varying float vWaterDepth;
            varying vec3 vWorldPos;
            
            float getSurfaceHeight(vec2 uv) {
                 vec2 flippedUV = vec2(uv.x, 1.0 - uv.y);
                 float h = texture2D(uHeightTex, flippedUV).r;
                 float w = texture2D(uWaterTex, flippedUV).r;
                 return (h + w) * uHeightScale;
            }

            void main() {
                // 边缘平滑参数
                float edgeSoftness = 0.002;
                
                // 显著降低丢弃阈值
                if (vWaterDepth < 1e-8) {
                    discard;
                }
                
                // --- Normal Calculation ---
                vec2 texel = 1.0 / uResolution;
                float centerH = getSurfaceHeight(vUv);
                float leftH = getSurfaceHeight(vUv - vec2(texel.x, 0.0));
                float rightH = getSurfaceHeight(vUv + vec2(texel.x, 0.0));
                float bottomH = getSurfaceHeight(vUv - vec2(0.0, texel.y));
                float topH = getSurfaceHeight(vUv + vec2(0.0, texel.y));
                
                // Convert UV space delta to World space delta
                // 1.0 UV = uTerrainSize World Units
                float worldUnitPerUV = uTerrainSize; 
                float dx = texel.x * worldUnitPerUV;
                float dy = texel.y * worldUnitPerUV;
                
                // Tangent vectors
                vec3 tangentX = vec3(dx * 2.0, 0.0, rightH - leftH);
                vec3 tangentY = vec3(0.0, dy * 2.0, topH - bottomH);
                
                // Normal is cross product (note coordinate system: Z is up in our calculation logic based on height, 
                // but in world space, mesh is rotated. 
                // Local mesh: x=right, y=up(world -z), z=height(world y)
                // Actually, let's look at Vertex Shader: pos.z is height.
                // So local normal would be roughly ( -dh/dx, -dh/dy, 1 ).
                
                vec3 localNormal = normalize(cross(tangentX, tangentY));
                
                // Since the mesh is rotated -90 deg around X, local Z is World Y.
                // Local Y is World -Z. Local X is World X.
                // We need to transform this local normal to world space.
                // The easiest way is to construct it directly in "World-ISH" orientation or rotate it.
                // Let's rely on standard TBN or manual rotation.
                // Mesh Rotation X = -90deg.
                // Local (x, y, z) -> World (x, z, -y) ?? No.
                // Rotation -90 X:
                // y' = y*cos(-90) - z*sin(-90) = z
                // z' = y*sin(-90) + z*cos(-90) = -y
                // So (x, y, z) -> (x, z, -y)
                
                vec3 worldNormal = vec3(localNormal.x, localNormal.z, -localNormal.y);


                // --- Lighting ---
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                vec3 lightDir = normalize(uLightDir);
                vec3 halfDir = normalize(lightDir + viewDir);
                
                // Fresnel - 污染水体通常透明度极低，反射更强（油膜感）
                float fresnelTerm = dot(viewDir, worldNormal);
                fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);
                float fresnel = 0.05 + 0.95 * pow(fresnelTerm, 3.0); // 调整 Fresnel 曲线，让斜向观察时反射更重
                
                // Specular (Blinn-Phong)
                float spec = pow(max(dot(worldNormal, halfDir), 0.0), uShininess);
                
                // --- Color Mixing ---
                
                // 平滑步进函数，避免硬边缘马赛克
                float smoothEdge = smoothstep(0.0, edgeSoftness, vWaterDepth);
                
                // 污染水体：深度感更强，颜色过渡更压抑
                float depthFactor = clamp(vWaterDepth / uMaxDepth, 0.0, 1.0);
                vec3 waterBaseColor = mix(uWaterColor, uDeepColor, pow(depthFactor, 0.7)); // 非线性混合增强深色感
                
                // Apply Lighting
                vec3 reflectionColor = uSpecularColor * 0.8; 
                
                // 混合基础颜色和反射
                vec3 finalColor = mix(waterBaseColor, reflectionColor, fresnel * 0.4); 
                
                // 增加一点浑浊的散射光感
                finalColor += uWaterColor * 0.1 * max(0.0, dot(worldNormal, lightDir));
                
                // Add direct specular highlight
                finalColor += uSpecularColor * spec * 0.5; 
                
                gl_FragColor = vec4(finalColor, smoothEdge);
            }
        `,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false
    });
}

// 创建 GPGPU 计算材质的辅助函数
function createGPGPUMaterial(shader, uniforms) {
    return new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
    });
}

// 污染标记着色器 - 标记水流过的区域
function createPollutionShader() {
    return {
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform sampler2D uPollutionTex;  // 当前污染标记纹理
            uniform sampler2D uWaterTex;      // 水深纹理
            uniform float uPollutionRate;     // 污染扩散速率
            uniform float uDecayRate;         // 污染衰减速率（自然净化）
            
            varying vec2 vUv;
            
            void main() {
                // 污染GPGPU与水GPGPU使用同一纹理坐标系，直接用vUv
                float currentPollution = texture2D(uPollutionTex, vUv).r;
                float waterDepth = texture2D(uWaterTex, vUv).r;
                
                // 设置更严格的水深阈值，避免极浅的水扩散污染
                float minPollutionDepth = 0.0001;
                
                float newPollution = currentPollution;
                if (waterDepth > minPollutionDepth) {
                    // 根据水深调整污染程度：水越深，污染增加越快
                    float depthFactor = smoothstep(minPollutionDepth, minPollutionDepth * 10.0, waterDepth);
                    float pollutionIncrease = uPollutionRate * depthFactor;
                    
                    newPollution = min(1.0, currentPollution + pollutionIncrease);
                } else {
                    // 没有水的地方，污染度缓慢衰减（模拟自然净化）
                    newPollution = max(0.0, currentPollution - uDecayRate);
                }
                
                gl_FragColor = vec4(newPollution, 0.0, 0.0, 1.0);
            }
        `
    };
}

function createTerrainShader() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uPollutionTex: { value: null },
            uWaterTex: { value: null },
            uDomTex: { value: null }, // 使用加载的 DOM 纹理
            uHasTerrainTex: { value: 1.0 },     // 标记已加载纹理
            uTerrainColor: { value: new THREE.Color(0x3a5f3a) },  // 正常地形颜色（绿色）
            uPollutionColor: { value: new THREE.Color(0x8b4513) }, // 污染颜色（鲜明的鞘棕色）
            uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.5) },
            uAmbient: { value: 0.4 },
            uDiffuse: { value: 0.6 }
        },
        vertexShader: `
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
        fragmentShader: `
                uniform sampler2D uPollutionTex;
                uniform sampler2D uWaterTex;
                uniform sampler2D uDomTex;
                uniform float uHasTerrainTex;
                uniform vec3 uTerrainColor;
                uniform vec3 uPollutionColor;
                uniform vec3 uLightDir;
                uniform float uAmbient;
                uniform float uDiffuse;
                
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    vec2 flippedUV = vec2(vUv.x, vUv.y);
                    // 污染纹理存储在GPGPU坐标系中（Y轴与网格UV相反），需翻转采样
                    vec2 gpgpuUV = vec2(vUv.x, 1.0 - vUv.y);
                    
                    // 获取基础地形颜色
                    vec3 baseColor = uTerrainColor;
                    if (uHasTerrainTex > 0.5) {
                        baseColor = texture2D(uDomTex, flippedUV).rgb;
                    }
                    
                    // 直接读取污染强度（线性过滤自动平滑）
                    float pollutionAmount = texture2D(uPollutionTex, gpgpuUV).r;
                    
                    // 使用非常宽的平滑步函数范围以获得柔和的边缘
                    float pollutionStrength = smoothstep(0.002, 0.15, pollutionAmount);
                    
                    // 混合基础颜色和污染颜色
                    vec3 finalColor = mix(baseColor, uPollutionColor, pollutionStrength * 0.7);
                    
                    // 简单光照计算
                    vec3 lightDir = normalize(uLightDir);
                    float diff = max(dot(vNormal, lightDir), 0.0);
                    vec3 color = finalColor * (uAmbient + uDiffuse * diff);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
    });
}

// 导出到全局作用域
window.FluidShaders = {
    createFluxShader,
    createWaterShader,
    createWaterRenderMaterial,
    createGPGPUMaterial,
    createPollutionShader,
    createTerrainShader
};
