const vs1 = `
                varying vec3 vColor;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    vColor = color;
                    vNormal = normalize(normalMatrix * normal);
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `;
const fs1 = `
                uniform float blackThreshold;
                uniform float opacity;
                varying vec3 vColor;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    // 简单光照计算
                    vec3 normal = normalize(vNormal);
                    vec3 viewDirection = normalize(vViewPosition);
                    // 环境光
                    vec3 ambient = vColor * 0.4;
                    // 漫反射光（简单定向光）
                    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
                    float diffuseStrength = max(dot(normal, lightDirection), 0.0);
                    vec3 diffuse = vColor * diffuseStrength * 0.6;
                    
                    // 组合颜色
                    gl_FragColor = vec4(ambient + diffuse, 1.0);
                }
            `;

const fs2 = `

                uniform float c_r;
                uniform float c_g;
                uniform float c_b;
                uniform float opacity;
                varying vec3 vColor;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    float epsilon = 0.1;
                    // 检测黑色 - 如果所有颜色分量都小于阈值，则设置为透明
                    if (abs(vColor.r - c_r) < epsilon && abs(vColor.g - c_g) < epsilon && abs(vColor.b - c_b) < epsilon) {
                        discard;
                    }
                    
                    // 简单光照计算
                    vec3 normal = normalize(vNormal);
                    vec3 viewDirection = normalize(vViewPosition);
                    
                    // 环境光
                    vec3 ambient = vColor * 0.4;
                    
                    // 漫反射光（简单定向光）
                    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
                    float diffuseStrength = max(dot(normal, lightDirection), 0.0);
                    vec3 diffuse = vColor * diffuseStrength * 0.6;
                    
                    // 组合颜色
                    gl_FragColor = vec4(ambient + diffuse, opacity);
                }
            `;

const vs2 = `
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal; // 新增：世界空间法线

void main() {
    vColor = color;
    vNormal = normalize(normalMatrix * normal);
    
    // 计算世界空间法线
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fs3 = `
uniform float c_r;
uniform float c_g;
uniform float c_b;
uniform float opacity;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal; // 需要在顶点着色器中计算并传递

void main() {
    float epsilon = 0.01;
    
    // 检测黑色 - 如果所有颜色分量都小于阈值，则设置为透明
    if (abs(vColor.r - c_r) < epsilon && 
        abs(vColor.g - c_g) < epsilon && 
        abs(vColor.b - c_b) < epsilon) {
        discard;
    }
    
    // 检测法线方向 - 如果法线主要在XZ平面内(Y分量接近0)，则不显示
    // 使用世界空间法线，确保不随相机变化
    float verticalThreshold = 0.1; // 调整这个值来控制过滤的严格程度
    
    // 使用绝对Y分量来判断是否在XZ平面内
    if (abs(vWorldNormal.y) < verticalThreshold) {
        discard;
    }
    
    // 简单光照计算（仍然使用视图空间法线进行光照计算）
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewPosition);
    
    // 环境光
    vec3 ambient = vColor * 0.2;
    
    // 漫反射光（简单定向光）
    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
    float diffuseStrength = max(dot(normal, lightDirection), 0.0);
    vec3 diffuse = vColor * diffuseStrength * 0.6;
    
    // 组合颜色
    gl_FragColor = vec4(ambient + diffuse, opacity);
}
`;

const vs4 = `
    attribute float elevation;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying float vElevation;

    void main() {
        vColor = color;
        vNormal = normalize(normalMatrix * normal);
        vElevation = elevation;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fs4 = `
    varying float vElevation;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
        if(vElevation < 1000.0){
            discard;
        }
        
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 ambient = vColor * 0.4;
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float diffuseStrength = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = vColor * diffuseStrength * 0.6;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
    }
`;

const vs5 = `
    attribute float elevation;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        if (abs(elevation) < 0.0001) {
            gl_Position = vec4(0.0, 0.0, 10000.0, 0.0);
            return;
        }

        vColor = color;
        vNormal = normalize(normalMatrix * normal);

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fs5 = `
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 ambient = vColor * 0.4;
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float diffuseStrength = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = vColor * diffuseStrength * 0.6;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
    }
`;

const vs6 = `
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        vColor = color;
        vNormal = normalize(normalMatrix * normal);

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fs6 = `
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 ambient = vColor * 0.4;
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float diffuseStrength = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = vColor * diffuseStrength * 0.6;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
    }
`;

const testLineVS1 = `
    attribute float lineProgress;
    varying float vProgress;
    
    void main() {
        vProgress = lineProgress;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const testLineFS1 = `
    varying float vProgress;
    
    // HSV 到 RGB 的转换函数
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
        // 使用 vProgress 作为色相 (Hue)，创建彩虹渐变
        // 色相范围 0.0 到 1.0，对应 0° 到 360°
        float hue = vProgress;
        float saturation = 1.0; // 饱和度
        float value = 1.0;      // 亮度
        
        vec3 rainbowColor = hsv2rgb(vec3(hue, saturation, value));
        gl_FragColor = vec4(rainbowColor, 1.0);
    }
`;

const testLineVS2 = `
    attribute float lineProgress;
    varying float vProgress;
    varying vec2 vUv;
    
    void main() {
        vProgress = lineProgress;
        vUv = uv; // 传递 UV 坐标
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const testLineFS2 = `
    uniform sampler2D colorTexture; // 颜色纹理
    varying float vProgress;
    varying vec2 vUv;
    uniform float time;
    
    void main() {
        vec2 animatedTexCoord = vec2(fract(vProgress - time), vUv.y);
        
        vec4 textureColor = texture2D(colorTexture, animatedTexCoord);
        gl_FragColor = textureColor;
    }
`;

const dash_line_vs = `
    varying float vT;
    void main() {
        vT = position.x;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const dash_line_fs = `
    varying float vT;
    void main() {
        float segment = mod(vT, 1.0);
        if(segment < 0.5) {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        } else {
            discard;
        }
    }
`;

const dash_line_flow_fs = `
    uniform float time;
    varying float vT;
    void main() {
        float animatedT = time * 0.2 - vT ;
        float segment = mod(animatedT * 1.2, 1.0);
        if(segment < 0.8) {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        } else {
            discard;
        }
    }
`;

const dash_line_flow_vs1 = `
    varying float vT;
    void main() {
        vT = position.x;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;


const dash_line_flow_fs1 = `
    uniform float time;
    uniform float line_len;
    varying float vT;
    void main() {
        float animatedT = time * 0.2 - vT ;
        //line_len/10.0---按线长分10分为虚线长度
        float segment = mod(animatedT , line_len/10.0);
        if(segment < line_len/20.0) {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        } else {
            discard;
        }
    }
`;


const dash_line_flow_vs2 = `
    varying float vT;
    void main() {
        vT = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;


const dash_line_flow_fs2 = `
    uniform float time;
    uniform float line_len;
    varying float vT;
    void main() {
        float animatedT =  vT + time * 0.2;
        //line_len/10.0---按线长分10分为虚线长度
        float segment = mod(animatedT , line_len/10.0);
        if(segment < line_len/20.0) {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        } else {
            discard;
        }
    }
`;
const dash_line_vs1 = `
    attribute float lineProgress;
    varying float vProgress;
    varying vec2 vUv;
    
    void main() {
        vProgress = lineProgress;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const dash_line_fs1 = `
    varying float vProgress;
    varying vec2 vUv;
    uniform float time;
    
    void main() {
        float dashSize = 0.2;
        float gapSize = 0.1;
        float totalLength = dashSize + gapSize;
        
        float animatedProgress = vProgress + time * 0.5;
        float pattern = mod(animatedProgress, totalLength);
        
        if(pattern < dashSize) {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        } else {
            discard;
        }
    }
`;

const ring_wave_vs1 = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const ring_wave_fs1 = `
    varying vec2 vUv;
    uniform float time;
    void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);

        float innerRadius = fract(time) * 0.2 + 0.1;
        float outerRadius = innerRadius + 0.05; 

        // ring为float,透明度渐变
        float ring = smoothstep(innerRadius - 0.02, innerRadius, dist) * 
                    smoothstep(outerRadius + 0.02, outerRadius, dist);
        gl_FragColor = vec4(1.0, 1.0, 0.0, ring);
    }
`

const ring_wave_vs2 = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
        
`

const ring_wave_fs2 = `
    uniform vec3 circleCenter;
    uniform float circleRadius;
    varying vec3 vWorldPosition;
    uniform float time;
    void main() {
        float dist = length(vWorldPosition.xz - circleCenter.xz) / circleRadius;
        if (dist > 1.0) {
            discard;
        }
        float ringPos = fract(time) * 0.8 + 0.1;  // 从0.1到0.9循环
        float ringWidth = 0.05;
        if(dist > ringPos && dist < ringPos + ringWidth){
            gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
        } else {
            discard;
        }
    }
`;

const green_wire_frame_mesh_vs1 = `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `

const green_wire_frame_mesh_fs1 = `
            uniform vec3 circleCenter;
            uniform float circleRadius;
            varying vec3 vWorldPosition;
            
            void main() {
                float dist = length(vWorldPosition.xz - circleCenter.xz);

                if (dist < circleRadius) {
                    // 可以根据距离渐变颜色
                    float intensity = 1.0 - (dist / circleRadius);
                    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), intensity);
                    gl_FragColor = vec4(color, 1.0);
                } else {
                    // 在区域外完全透明
                    discard;
                }
            }
        `


const click_triangle_vs1 = `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `

const click_triangle_fs1 = `
            uniform vec3 triangleA;
            uniform vec3 triangleB;
            uniform vec3 triangleC;
            uniform vec3 bestNeighborA;
            uniform vec3 bestNeighborB;
            uniform vec3 bestNeighborC;
            uniform bool showTriangle;
            uniform bool showBestNeighbor;
            varying vec3 vWorldPosition;
            
            bool pointInTriangle(vec3 p, vec3 a, vec3 b, vec3 c) {
                vec2 p2 = p.xz;
                vec2 a2 = a.xz;
                vec2 b2 = b.xz;
                vec2 c2 = c.xz;
                
                vec2 v0 = c2 - a2;
                vec2 v1 = b2 - a2;
                vec2 v2 = p2 - a2;
                
                float dot00 = dot(v0, v0);
                float dot01 = dot(v0, v1);
                float dot02 = dot(v0, v2);
                float dot11 = dot(v1, v1);
                float dot12 = dot(v1, v2);
                
                float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
                float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
                float v = (dot00 * dot12 - dot01 * dot02) * invDenom;
                
                return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.001);
            }
            
            void main() {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                
                // 检查是否在点击的三角形内
                if (showTriangle && pointInTriangle(vWorldPosition, triangleA, triangleB, triangleC)) {
                    gl_FragColor = vec4(1.0, 1.0, 0.0, 0.8);
                    return;
                }
                
                // 检查是否在差值最大的相邻三角形内
                if (showBestNeighbor && pointInTriangle(vWorldPosition, bestNeighborA, bestNeighborB, bestNeighborC)) {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 0.8);
                    return;
                }
            }
        `