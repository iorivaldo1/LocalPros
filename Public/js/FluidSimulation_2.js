// 流体模拟核心类
class FluidSimulation {
    constructor(renderer, width, height) {
        this.renderer = renderer;
        this.width = width || 256;
        this.height = height || 256;

        // 渲染目标纹理
        this.textures = {
            waterFlow: null,
            waterHeight: null,
            tempFlow: null,
            tempHeight: null
        };

        // 自定义着色器材质
        this.waterFlowMaterial = null;
        this.waterHeightMaterial = null;

        // 渲染场景和相机
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // 渲染平面
        this.plane = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial()
        );
        this.scene.add(this.plane);

        this.init();
    }

    init() {
        this.createFrameBuffers();
        this.createShaders();
        this.initializeWaterData();
    }

    // 创建帧缓冲
    createFrameBuffers() {
        const options = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        };

        // 创建水流速度场帧缓冲
        this.textures.waterFlow = new THREE.WebGLRenderTarget(
            this.width, this.height, options
        );
        this.textures.tempFlow = new THREE.WebGLRenderTarget(
            this.width, this.height, options
        );

        // 创建水深高度场帧缓冲
        this.textures.waterHeight = new THREE.WebGLRenderTarget(
            this.width, this.height, options
        );
        this.textures.tempHeight = new THREE.WebGLRenderTarget(
            this.width, this.height, options
        );

        console.log('帧缓冲创建完成');
    }

    // 创建着色器
    createShaders() {
        // 水流计算着色器
        this.waterFlowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                velocityTexture: { value: null },
                heightTexture: { value: null },
                obstacleTexture: { value: null },
                dt: { value: 0.016 },
                viscosity: { value: 0.0001 },
                resolution: { value: new THREE.Vector2(this.width, this.height) }
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
            fragmentShader: `
                        uniform sampler2D velocityTexture;
                        uniform sampler2D heightTexture;
                        uniform sampler2D obstacleTexture;
                        uniform float dt;
                        uniform float viscosity;
                        uniform vec2 resolution;
                        varying vec2 vUv;
                        
                        void main() {
                            vec2 texelSize = 1.0 / resolution;
                            
                            // 读取当前速度
                            vec2 velocity = texture2D(velocityTexture, vUv).xy;
                            
                            // 粘度扩散
                            vec2 velocityLeft = texture2D(velocityTexture, vUv - vec2(texelSize.x, 0.0)).xy;
                            vec2 velocityRight = texture2D(velocityTexture, vUv + vec2(texelSize.x, 0.0)).xy;
                            vec2 velocityBottom = texture2D(velocityTexture, vUv - vec2(0.0, texelSize.y)).xy;
                            vec2 velocityTop = texture2D(velocityTexture, vUv + vec2(0.0, texelSize.y)).xy;
                            
                            vec2 velocityDiffusion = (velocityLeft + velocityRight + velocityBottom + velocityTop - 4.0 * velocity) * viscosity;
                            velocity += velocityDiffusion * dt;
                            
                            // 压力梯度驱动水流
                            float heightLeft = texture2D(heightTexture, vUv - vec2(texelSize.x, 0.0)).x;
                            float heightRight = texture2D(heightTexture, vUv + vec2(texelSize.x, 0.0)).x;
                            float heightBottom = texture2D(heightTexture, vUv - vec2(0.0, texelSize.y)).x;
                            float heightTop = texture2D(heightTexture, vUv + vec2(0.0, texelSize.y)).x;
                            
                            vec2 pressureGradient = vec2(heightRight - heightLeft, heightTop - heightBottom) * 0.5;
                            velocity -= pressureGradient * dt * 10.0;
                            
                            // 边界条件
                            float obstacle = texture2D(obstacleTexture, vUv).x;
                            if (obstacle > 0.5) {
                                velocity = vec2(0.0);
                            }
                            
                            gl_FragColor = vec4(velocity, 0.0, 1.0);
                        }
                    `
        });

        // 水深高度计算着色器
        this.waterHeightMaterial = new THREE.ShaderMaterial({
            uniforms: {
                heightTexture: { value: null },
                velocityTexture: { value: null },
                obstacleTexture: { value: null },
                dt: { value: 0.016 },
                evaporation: { value: 0.99 },
                resolution: { value: new THREE.Vector2(this.width, this.height) }
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
            fragmentShader: `
                        uniform sampler2D heightTexture;
                        uniform sampler2D velocityTexture;
                        uniform sampler2D obstacleTexture;
                        uniform float dt;
                        uniform float evaporation;
                        uniform vec2 resolution;
                        varying vec2 vUv;
                        
                        void main() {
                            vec2 texelSize = 1.0 / resolution;
                            
                            // 平流
                            vec2 velocity = texture2D(velocityTexture, vUv).xy;
                            vec2 advectPos = vUv - velocity * dt * texelSize;
                            float height = texture2D(heightTexture, advectPos).x;
                            
                            // 蒸发效应
                            height *= evaporation;
                            
                            // 边界条件
                            float obstacle = texture2D(obstacleTexture, vUv).x;
                            if (obstacle > 0.5) {
                                height = 0.0;
                            }
                            
                            height = max(height, 0.0);
                            
                            gl_FragColor = vec4(height, height, height, 1.0);
                        }
                    `
        });
    }

    // 初始化水体数据
    initializeWaterData() {
        const initialFlowData = new Float32Array(this.width * this.height * 4);
        const initialHeightData = new Float32Array(this.width * this.height * 4);
        const initialObstacleData = new Float32Array(this.width * this.height * 4);

        for (let i = 0; i < this.width * this.height; i++) {
            const x = (i % this.width) / this.width;
            const y = Math.floor(i / this.width) / this.height;

            // 初始水流为零
            initialFlowData[i * 4] = 0.0;
            initialFlowData[i * 4 + 1] = 0.0;
            initialFlowData[i * 4 + 2] = 0.0;
            initialFlowData[i * 4 + 3] = 1.0;

            // 初始高度
            const dx = x - 0.5;
            const dy = y - 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);
            initialHeightData[i * 4] = dist < 0.1 ? 0.5 : 0.0;
            initialHeightData[i * 4 + 1] = initialHeightData[i * 4];
            initialHeightData[i * 4 + 2] = initialHeightData[i * 4];
            initialHeightData[i * 4 + 3] = 1.0;

            // 障碍物：边界
            initialObstacleData[i * 4] = (x < 0.02 || x > 0.98 || y < 0.02 || y > 0.98) ? 1.0 : 0.0;
            initialObstacleData[i * 4 + 1] = initialObstacleData[i * 4];
            initialObstacleData[i * 4 + 2] = initialObstacleData[i * 4];
            initialObstacleData[i * 4 + 3] = 1.0;
        }

        // 创建障碍物纹理
        this.obstacleTexture = new THREE.DataTexture(
            initialObstacleData, this.width, this.height, THREE.RGBAFormat, THREE.FloatType
        );
        this.obstacleTexture.needsUpdate = true;

        // 使用渲染到纹理的方式来初始化数据
        this.initializeTextureData(this.textures.waterFlow, initialFlowData);
        this.initializeTextureData(this.textures.waterHeight, initialHeightData);
        this.initializeTextureData(this.textures.tempFlow, initialFlowData);
        this.initializeTextureData(this.textures.tempHeight, initialHeightData);
    }

    // 修复：使用更安全的方式初始化纹理数据
    initializeTextureData(renderTarget, data) {
        // 创建一个临时的着色器材质来初始化纹理数据
        const initMaterial = new THREE.ShaderMaterial({
            uniforms: {
                initData: { value: new THREE.DataTexture(data, this.width, this.height, THREE.RGBAFormat, THREE.FloatType) }
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
            fragmentShader: `
                        uniform sampler2D initData;
                        varying vec2 vUv;
                        void main() {
                            gl_FragColor = texture2D(initData, vUv);
                        }
                    `
        });

        // 设置初始化数据纹理
        initMaterial.uniforms.initData.value.needsUpdate = true;

        // 渲染到目标纹理
        this.plane.material = initMaterial;
        this.renderer.setRenderTarget(renderTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

        // 清理临时材质
        initMaterial.dispose();
    }

    // 添加水波扰动
    addDisturbance(x, y, radius = 0.05, intensity = 1.0) {
        // 创建扰动数据
        const disturbanceData = new Float32Array(this.width * this.height * 4);

        for (let i = 0; i < this.width * this.height; i++) {
            const px = (i % this.width) / this.width;
            const py = Math.floor(i / this.width) / this.height;

            const dx = px - x;
            const dy = py - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                const falloff = 1.0 - (dist / radius);
                disturbanceData[i * 4] = falloff * intensity;
                disturbanceData[i * 4 + 1] = disturbanceData[i * 4];
                disturbanceData[i * 4 + 2] = disturbanceData[i * 4];
                disturbanceData[i * 4 + 3] = 1.0;
            } else {
                disturbanceData[i * 4] = 0.0;
                disturbanceData[i * 4 + 1] = 0.0;
                disturbanceData[i * 4 + 2] = 0.0;
                disturbanceData[i * 4 + 3] = 1.0;
            }
        }

        // 使用着色器方式添加扰动
        const disturbMaterial = new THREE.ShaderMaterial({
            uniforms: {
                currentHeight: { value: this.textures.waterHeight.texture },
                disturbance: { value: new THREE.DataTexture(disturbanceData, this.width, this.height, THREE.RGBAFormat, THREE.FloatType) }
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
            fragmentShader: `
                        uniform sampler2D currentHeight;
                        uniform sampler2D disturbance;
                        varying vec2 vUv;
                        void main() {
                            float current = texture2D(currentHeight, vUv).x;
                            float disturb = texture2D(disturbance, vUv).x;
                            gl_FragColor = vec4(current + disturb, current + disturb, current + disturb, 1.0);
                        }
                    `
        });

        disturbMaterial.uniforms.disturbance.value.needsUpdate = true;

        this.plane.material = disturbMaterial;
        this.renderer.setRenderTarget(this.textures.tempHeight);
        this.renderer.render(this.scene, this.camera);
        this.swapTextures('waterHeight', 'tempHeight');
        this.renderer.setRenderTarget(null);

        disturbMaterial.dispose();
    }

    // 执行流体模拟步骤
    update(dt) {
        this.waterFlowMaterial.uniforms.dt.value = dt;
        this.waterHeightMaterial.uniforms.dt.value = dt;

        // 步骤1: 计算水流
        this.plane.material = this.waterFlowMaterial;
        this.waterFlowMaterial.uniforms.velocityTexture.value = this.textures.waterFlow.texture;
        this.waterFlowMaterial.uniforms.heightTexture.value = this.textures.waterHeight.texture;
        this.waterFlowMaterial.uniforms.obstacleTexture.value = this.obstacleTexture;

        this.renderer.setRenderTarget(this.textures.tempFlow);
        this.renderer.render(this.scene, this.camera);
        this.swapTextures('waterFlow', 'tempFlow');

        // 步骤2: 计算水深高度
        this.plane.material = this.waterHeightMaterial;
        this.waterHeightMaterial.uniforms.heightTexture.value = this.textures.waterHeight.texture;
        this.waterHeightMaterial.uniforms.velocityTexture.value = this.textures.waterFlow.texture;
        this.waterHeightMaterial.uniforms.obstacleTexture.value = this.obstacleTexture;

        this.renderer.setRenderTarget(this.textures.tempHeight);
        this.renderer.render(this.scene, this.camera);
        this.swapTextures('waterHeight', 'tempHeight');

        this.renderer.setRenderTarget(null);
    }

    // 交换纹理
    swapTextures(textureA, textureB) {
        const temp = this.textures[textureA];
        this.textures[textureA] = this.textures[textureB];
        this.textures[textureB] = temp;
    }

    getHeightTexture() {
        return this.textures.waterHeight.texture;
    }
}