class PingPongTerrainRenderer {
    constructor(geometry, originalElevations) {
        this.geometry = geometry;
        this.originalElevations = originalElevations;
        this.segments = 10; // 将高程分成10段
        this.currentSegment = 0; // 当前要隐藏的段索引
        this.frameCount = 0;
        
        // 创建两个帧缓冲区
        this.buffA = this.createRenderTarget();
        this.buffB = this.createRenderTarget();
        
        // 初始状态：buffA为读取缓冲区，buffB为写入缓冲区
        this.readBuffer = this.buffA;
        this.writeBuffer = this.buffB;
        
        // 创建渲染到纹理的场景
        this.textureScene = new THREE.Scene();
        this.textureCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // 创建屏幕四边形用于渲染到纹理
        this.screenQuad = this.createScreenQuad();
        this.textureScene.add(this.screenQuad);
        
        // 创建用于显示最终结果的材质
        this.displayMaterial = this.createDisplayMaterial();
        
        // 创建显示用的网格
        this.displayMesh = new THREE.Mesh(geometry, this.displayMaterial);
        scene.add(this.displayMesh);
        
        // 初始化第一帧数据：将所有顶点数据写入buffA
        this.initializeFirstFrame();
    }
    
    createRenderTarget() {
        // 创建与几何体顶点数量匹配的纹理（取最接近的2的幂）
        const textureSize = Math.pow(2, Math.ceil(Math.log2(Math.sqrt(this.geometry.attributes.position.count))));
        
        return new THREE.WebGLRenderTarget(textureSize, textureSize, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false
        });
    }
    
    createScreenQuad() {
        const geometry = new THREE.PlaneGeometry(2, 2);
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                inputTexture: { value: null },
                originalElevations: { value: null },
                vertexCount: { value: this.geometry.attributes.position.count },
                textureSize: { value: Math.pow(2, Math.ceil(Math.log2(Math.sqrt(this.geometry.attributes.position.count)))) },
                currentSegment: { value: 0 },
                segmentHeight: { value: 1 / this.segments },
                frameCount: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D inputTexture;
                uniform float vertexCount;
                uniform float textureSize;
                uniform float currentSegment;
                uniform float segmentHeight;
                uniform float frameCount;
                
                varying vec2 vUv;
                
                // 将UV坐标转换为顶点索引
                float getVertexIndex(vec2 uv) {
                    vec2 texCoord = uv * textureSize;
                    float index = texCoord.y * textureSize + texCoord.x;
                    return index;
                }
                
                // 将顶点索引转换为UV坐标
                vec2 getUVFromIndex(float index) {
                    float y = floor(index / textureSize);
                    float x = index - y * textureSize;
                    return vec2(x, y) / textureSize;
                }
                
                // 根据原始高程和当前段判断是否应该显示
                float shouldShow(float originalHeight, float currentSegment) {
                    float segment = floor(originalHeight / segmentHeight);
                    
                    // 从最低段开始隐藏
                    if (frameCount == 0.0) {
                        return 1.0; // 第一帧显示所有
                    }
                    
                    // 从第0段开始，逐段隐藏
                    if (segment <= currentSegment) {
                        return 0.0; // 隐藏
                    } else {
                        return 1.0; // 显示
                    }
                }
                
                void main() {
                    // 获取当前片元对应的顶点索引
                    float vertexIndex = getVertexIndex(vUv);
                    
                    if (vertexIndex >= vertexCount) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        return;
                    }
                    
                    // 如果是第一帧，直接存储原始数据
                    if (frameCount == 0.0) {
                        // 存储顶点位置和原始高程
                        vec2 uvForVertex = getUVFromIndex(vertexIndex);
                        gl_FragColor = vec4(uvForVertex, originalHeight, 1.0);
                    } else {
                        // 从输入纹理读取上一帧的数据
                        vec4 previousData = texture2D(inputTexture, vUv);
                        
                        // 提取信息
                        vec2 storedUV = previousData.xy;
                        float originalHeight = previousData.z;
                        
                        // 判断当前顶点是否应该显示
                        float visibility = shouldShow(originalHeight, currentSegment);
                        
                        // 如果不显示，将高程设为最小值
                        float displayHeight = mix(0.0, originalHeight, visibility);
                        
                        // 输出新数据
                        gl_FragColor = vec4(storedUV, displayHeight, visibility);
                    }
                }
            `
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    createDisplayMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                terrainTexture: { value: null },
                vertexCount: { value: this.geometry.attributes.position.count },
                textureSize: { value: Math.pow(2, Math.ceil(Math.log2(Math.sqrt(this.geometry.attributes.position.count)))) },
                originalPositions: { value: null },
                maxElevation: { value: maxElevation },
                minElevation: { value: minElevation }
            },
            vertexShader: `
                attribute vec3 position;
                attribute vec3 normal;
                attribute vec2 uv;
                
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform sampler2D terrainTexture;
                uniform float vertexCount;
                uniform float textureSize;
                uniform float maxElevation;
                uniform float minElevation;
                
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vElevation;
                
                // 将顶点索引转换为UV坐标
                vec2 getUVFromIndex(float index) {
                    float y = floor(index / textureSize);
                    float x = index - y * textureSize;
                    return vec2(x, y) / textureSize;
                }
                
                void main() {
                    // 获取当前顶点在纹理中的位置
                    float vertexIndex = float(gl_VertexID);
                    vec2 texCoord = getUVFromIndex(vertexIndex) + vec2(0.5) / textureSize;
                    
                    // 从纹理读取处理后的高程数据
                    vec4 terrainData = texture2D(terrainTexture, texCoord);
                    
                    // 提取处理后的高程和可见性
                    float processedHeight = terrainData.z;
                    float visibility = terrainData.w;
                    
                    // 计算实际高程（逆归一化）
                    float actualElevation = processedHeight * (maxElevation - minElevation) + minElevation;
                    
                    // 创建新位置
                    vec3 newPosition = position;
                    newPosition.z = actualElevation * 2.0; // 适当缩放高程
                    
                    // 如果不可见，将顶点下沉到地面以下
                    if (visibility < 0.5) {
                        newPosition.z = -1.0;
                    }
                    
                    vNormal = normal;
                    vUv = uv;
                    vElevation = actualElevation;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform float maxElevation;
                uniform float minElevation;
                
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vElevation;
                
                // 根据高程计算颜色
                vec3 elevationToColor(float elevation) {
                    // 归一化高程
                    float t = (elevation - minElevation) / (maxElevation - minElevation);
                    
                    // 创建地形颜色梯度
                    if (t < 0.2) return mix(vec3(0.1, 0.3, 0.1), vec3(0.2, 0.6, 0.2), t * 5.0);
                    else if (t < 0.5) return mix(vec3(0.2, 0.6, 0.2), vec3(0.8, 0.7, 0.4), (t - 0.2) * 3.33);
                    else return mix(vec3(0.8, 0.7, 0.4), vec3(0.9, 0.9, 0.9), (t - 0.5) * 2.0);
                }
                
                void main() {
                    // 基础颜色
                    vec3 baseColor = elevationToColor(vElevation);
                    
                    // 简单的光照
                    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                    float diffuse = max(dot(normalize(vNormal), lightDir), 0.2);
                    
                    vec3 finalColor = baseColor * diffuse;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            wireframe: false
        });
    }
    
    initializeFirstFrame() {
        // 准备原始高程数据纹理
        const textureSize = Math.pow(2, Math.ceil(Math.log2(Math.sqrt(this.geometry.attributes.position.count))));
        const elevationTextureData = new Float32Array(textureSize * textureSize * 4);
        
        for (let i = 0; i < this.originalElevations.length; i++) {
            const x = i % textureSize;
            const y = Math.floor(i / textureSize);
            const index = (y * textureSize + x) * 4;
            
            // 将UV坐标和原始高程存储到纹理
            elevationTextureData[index] = x / textureSize;
            elevationTextureData[index + 1] = y / textureSize;
            elevationTextureData[index + 2] = this.originalElevations[i];
            elevationTextureData[index + 3] = 1.0; // 初始可见性
        }
        
        // 创建纹理
        const dataTexture = new THREE.DataTexture(
            elevationTextureData,
            textureSize,
            textureSize,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        dataTexture.needsUpdate = true;
        
        // 渲染到buffA（第一帧）
        renderer.setRenderTarget(this.buffA);
        this.screenQuad.material.uniforms.inputTexture.value = null;
        this.screenQuad.material.uniforms.frameCount.value = 0;
        this.screenQuad.material.uniforms.currentSegment.value = 0;
        renderer.render(this.textureScene, this.textureCamera);
        renderer.setRenderTarget(null);
        
        // 将buffA的纹理传递给显示材质
        this.displayMaterial.uniforms.terrainTexture.value = this.buffA.texture;
        
        console.log('第一帧初始化完成，显示所有顶点');
    }
    
    swapBuffers() {
        [this.readBuffer, this.writeBuffer] = [this.writeBuffer, this.readBuffer];
    }
    
    update() {
        this.frameCount++;
        
        // 每10帧切换一个段（可根据需要调整速度）
        if (this.frameCount % 10 === 0) {
            this.currentSegment = (this.currentSegment + 1) % (this.segments + 1);
            console.log(`切换到段 ${this.currentSegment}，隐藏前 ${this.currentSegment} 段`);
        }
        
        // 设置材质uniforms
        this.screenQuad.material.uniforms.inputTexture.value = this.readBuffer.texture;
        this.screenQuad.material.uniforms.frameCount.value = this.frameCount;
        this.screenQuad.material.uniforms.currentSegment.value = this.currentSegment;
        this.screenQuad.material.uniforms.segmentHeight.value = 1.0 / this.segments;
        
        // 渲染到写入缓冲区
        renderer.setRenderTarget(this.writeBuffer);
        renderer.render(this.textureScene, this.textureCamera);
        
        // 交换缓冲区
        this.swapBuffers();
        
        // 更新显示材质的纹理
        this.displayMaterial.uniforms.terrainTexture.value = this.readBuffer.texture;
        this.displayMaterial.needsUpdate = true;
        
        // 输出当前状态信息
        if (this.frameCount % 10 === 0) {
            const visiblePercentage = ((this.segments - this.currentSegment) / this.segments * 100).toFixed(1);
            console.log(`帧数: ${this.frameCount}, 隐藏段: ${this.currentSegment}, 可见度: ${visiblePercentage}%`);
        }
    }
    
    getCurrentState() {
        return {
            frameCount: this.frameCount,
            currentSegment: this.currentSegment,
            totalSegments: this.segments,
            visiblePercentage: ((this.segments - this.currentSegment) / this.segments * 100).toFixed(1) + '%'
        };
    }
}
