function threeSim(map){
    var flag = 0;
    let bt = $(".switch")[5];
    let circl = $(".switch_circle")[5];
    if (!bt || !circl) {
        return;
    }

    const simState = {
        root: null,
        renderer: null,
        scene: null,
        camera: null,
        controls: null,
        terrainMesh: null,
        tiffBoundaryOverlay: null,
        cleanupFns: [],
        animationId: null,
        running: false
    };

    // 将清理逻辑挂到 window 上，供页面头部导航按钮跳转时调用
    function _doStopFromExternal() {
        if (flag === 0) return;
        stopThreeSim(simState);
        $('.switch').eq(2).prop('disabled', false);
        $('.switch').eq(3).prop('disabled', false);
        $('.switch').eq(4).prop('disabled', false);
        map.centerAndZoom(new T.LngLat(103.00833, 29.98527), zoom);
        layer.msg("三维场景模拟已关闭", { time: 1000 });
        flag = 0;
        // 不清空 window.__threeSimStop，场景可能被再次开启，保留引用以便下次导航时仍能关闭
    }
    window.__threeSimStop = _doStopFromExternal;

    bt.addEventListener("click", async function (e) {
        e.stopPropagation();
        bt.classList.toggle("switch_active");
        circl.classList.toggle("circle_right");
        circl.classList.toggle("circle_left");

        if (flag === 0) {
            flag = 1;
            $('.switch').eq(2).prop('disabled', true);
            $('.switch').eq(3).prop('disabled', true);
            $('.switch').eq(4).prop('disabled', true);

            try {
                await ensureThreeDeps();
                const bounds = await startThreeSim(simState);
                if (bounds) {
                    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
                    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
                    map.centerAndZoom(new T.LngLat(centerLng+0.1, centerLat), 12);
                    drawTiffBoundary(map, bounds);
                }
                layer.msg("三维场景模拟已开启", { time: 1200 });
            } catch (err) {
                console.error(err);
                layer.msg("三维场景模拟初始化失败", { time: 1800 });
                bt.classList.toggle("switch_active");
                circl.classList.toggle("circle_right");
                circl.classList.toggle("circle_left");
                $('.switch').eq(2).prop('disabled', false);
                $('.switch').eq(3).prop('disabled', false);
                $('.switch').eq(4).prop('disabled', false);
                flag = 0;
            }
        } else {
            _doStopFromExternal();
        }
    });

    function ensureThreeDeps() {
        if (window.__wrksThreeSimDepsPromise) {
            return window.__wrksThreeSimDepsPromise;
        }

        function normalizePath(url) {
            try {
                return new URL(url, window.location.origin).pathname;
            } catch (e) {
                return url;
            }
        }

        function findExistingScript(src) {
            const targetPath = normalizePath(src);
            const scripts = document.querySelectorAll('script[src]');
            for (let i = 0; i < scripts.length; i++) {
                const script = scripts[i];
                const scriptSrc = script.getAttribute('src') || '';
                if (normalizePath(scriptSrc) === targetPath) {
                    return script;
                }
            }
            return null;
        }

        function loadScript(src) {
            return new Promise((resolve, reject) => {
                const exist = findExistingScript(src);
                if (exist) {
                    if (exist.dataset.loaded === '1' || exist.readyState === 'complete' || exist.readyState === 'loaded') {
                        resolve();
                        return;
                    }
                    exist.addEventListener('load', () => resolve(), { once: true });
                    exist.addEventListener('error', () => reject(new Error(`加载失败: ${src}`)), { once: true });
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = () => {
                    script.dataset.loaded = '1';
                    resolve();
                };
                script.onerror = () => reject(new Error(`加载失败: ${src}`));
                document.head.appendChild(script);
            });
        }

        async function loadScriptWithFallback(urls, checkFn, depName) {
            let lastError = null;
            if (typeof checkFn === 'function' && checkFn()) {
                return;
            }
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                try {
                    if (typeof checkFn === 'function' && checkFn()) {
                        return;
                    }
                    await loadScript(url);
                    if (typeof checkFn === 'function' && checkFn()) {
                        return;
                    }
                } catch (e) {
                    lastError = e;
                }
            }
            throw new Error((depName || '依赖') + ' 加载失败' + (lastError ? ': ' + lastError.message : ''));
        }

        window.__wrksThreeSimDepsPromise = (async function () {
            if (!window.THREE) {
                await loadScriptWithFallback([
                    '/js/three.min.js',
                    '/public/js/three.min.js'
                ], function () {
                    return !!window.THREE;
                }, 'three.js');
            }
            if (!window.THREE || !window.THREE.OrbitControls) {
                await loadScriptWithFallback([
                    '/js/OrbitControls.js',
                    '/public/js/OrbitControls.js'
                ], function () {
                    return !!(window.THREE && window.THREE.OrbitControls);
                }, 'OrbitControls');
            }
            if (!window.GeoTIFF) {
                await loadScriptWithFallback([
                    '/js/geotiff.js',
                    '/public/js/geotiff.js'
                ], function () {
                    return !!window.GeoTIFF;
                }, 'GeoTIFF');
            }
            if (!window.FluidShaders) {
                await loadScriptWithFallback([
                    '/js/s2.js',
                    '/public/js/s2.js'
                ], function () {
                    return !!window.FluidShaders;
                }, 'FluidShaders');
            }
        })();

        window.__wrksThreeSimDepsPromise = window.__wrksThreeSimDepsPromise.catch(function (err) {
            window.__wrksThreeSimDepsPromise = null;
            throw err;
        });

        return window.__wrksThreeSimDepsPromise;
    }

    function stopThreeSim(state) {
        state.running = false;
        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }
        state.cleanupFns.forEach(fn => {
            try { fn(); } catch (e) { console.warn(e); }
        });
        state.cleanupFns = [];

        if (state.controls && state.controls.dispose) {
            state.controls.dispose();
        }
        if (state.renderer) {
            // forceContextLoss 强制释放 WebGL 上下文（GPU 资源），
            // dispose 只释放 Three.js 内部对象，不会主动关闭 context
            if (state.renderer.forceContextLoss) {
                try { state.renderer.forceContextLoss(); } catch (e) { console.warn('forceContextLoss:', e); }
            }
            state.renderer.dispose();
        }
        if (state.root && state.root.parentNode) {
            state.root.parentNode.removeChild(state.root);
        }

        state.root = null;
        state.renderer = null;
        state.scene = null;
        state.camera = null;
        state.controls = null;
        state.terrainMesh = null;
    }

    function drawTiffBoundary(mapInstance, bounds) {
        const points = [
            new T.LngLat(bounds.minLng, bounds.minLat),
            new T.LngLat(bounds.maxLng, bounds.minLat),
            new T.LngLat(bounds.maxLng, bounds.maxLat),
            new T.LngLat(bounds.minLng, bounds.maxLat),
            new T.LngLat(bounds.minLng, bounds.minLat)
        ];
        const polyline = new T.Polyline(points, {
            id: 'tiff-boundary',
            color: '#0066ff',
            weight: 2,
            opacity: 0.8,
            lineStyle: 'dashed'
        });
        mapInstance.addOverLay(polyline);
        simState.tiffBoundaryOverlay = polyline;
    }

    async function startThreeSim(state) {
        stopThreeSim(state);

        const mapDiv = document.getElementById('mapDiv');
        if (!mapDiv) {
            throw new Error('mapDiv not found');
        }

        // 污染面叠加 Canvas：position:fixed 挂到 body，用 getBoundingClientRect 对齐 mapDiv
        // 完全不修改 mapDiv 的任何 CSS
        const pollutionOverlayCanvas = document.createElement('canvas');
        pollutionOverlayCanvas.id = 'three-sim-pollution-overlay';
        pollutionOverlayCanvas.style.position = 'fixed';
        pollutionOverlayCanvas.style.pointerEvents = 'none';
        pollutionOverlayCanvas.style.zIndex = '500';
        document.body.appendChild(pollutionOverlayCanvas);
        function resizePollutionCanvas() {
            const rect = mapDiv.getBoundingClientRect();
            const topHeader = document.querySelector('.topheader');
            const headerH = topHeader ? topHeader.offsetHeight : 0;
            pollutionOverlayCanvas.style.left   = rect.left + 'px';
            pollutionOverlayCanvas.style.top    = (rect.top + headerH) + 'px';
            pollutionOverlayCanvas.width  = Math.round(rect.width);
            pollutionOverlayCanvas.height = Math.round(rect.height - headerH);
        }
        resizePollutionCanvas();

        if (state.tiffBoundaryOverlay && map) {
            try {
                map.removeOverLay(state.tiffBoundaryOverlay);
            } catch (e) {
                console.warn('移除 TIFF boundary overlay 失败', e);
            }
            state.tiffBoundaryOverlay = null;
        }

        const root = document.createElement('div');
        root.id = 'three-sim-render-root';
        root.style.position = 'fixed';
        root.style.left = '0';
        root.style.top = '0';
        root.style.zIndex = '9999';
        root.style.background = '#050a10';
        root.style.overflow = 'hidden';
        root.style.borderRadius = '8px';
        root.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
        document.body.appendChild(root);

        function updateRootPanelSize() {
            const rect = mapDiv.getBoundingClientRect();
            const topHeader = document.querySelector('.topheader');
            const headerHeight = topHeader ? topHeader.offsetHeight : 0;
            
            const mapW = rect.width || window.innerWidth;
            const mapH = rect.height || window.innerHeight;
            const panelW = 980;
            const panelH = 980;
            const finalW = Math.max(panelW, 360);
            const finalH = Math.max(panelH, 260);
            root.style.width = finalW + 'px';
            root.style.height = finalH + 'px';
            root.style.left = Math.max(rect.left + rect.width - finalW - 16, 0) + 'px';
            root.style.top = (headerHeight + 72) + 'px';
        }

        updateRootPanelSize();

        const TERRAIN_SIZE = 10;
        const HEIGHT_SCALE = 1.0;
        const params = {
            gravity: 9.0,       // 较大重力保持质量感
            pipeArea: 0.35,      // 适中管道面积，保持流动性
            pipeLength: 0.8,     // 适中管道长度
            dt: 0.005,           // 适中时间步长
            injectAmount: 5.0,
            injectRadius: 0.005,
            evaporation: 0.0000001  // 每一小步蒸发的比例
        };

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, root.clientWidth / root.clientHeight, 0.1, 1000);
        camera.position.set(0,10,1);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(root.clientWidth, root.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.zIndex = '10000';
        root.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        async function fetchArrayBufferWithFallback(urls) {
            let lastErr = null;
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                try {
                    const response = await fetch(url, { cache: 'no-store' });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    const buffer = await response.arrayBuffer();
                    return { url, buffer };
                } catch (err) {
                    lastErr = err;
                }
            }
            throw new Error(`资源加载失败: ${lastErr ? lastErr.message : '未知错误'}`);
        }

        function isLikelyTiff(buffer) {
            if (!buffer || buffer.byteLength < 4) {
                return false;
            }
            const bytes = new Uint8Array(buffer, 0, 4);
            const littleClassic = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00;
            const bigClassic = bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A;
            const littleBigTiff = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2B && bytes[3] === 0x00;
            const bigBigTiff = bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2B;
            return littleClassic || bigClassic || littleBigTiff || bigBigTiff;
        }

        async function readGeoTiffWithFallback(urls, tag) {
            const { url, buffer } = await fetchArrayBufferWithFallback(urls);
            if (!isLikelyTiff(buffer)) {
                throw new Error(`${tag} 不是有效TIFF，实际地址: ${url}`);
            }
            const tiff = await GeoTIFF.fromArrayBuffer(buffer);
            const image = await tiff.getImage();
            const rasters = await image.readRasters();
            return { image, rasters, url };
        }

        const terrainResult = await readGeoTiffWithFallback([
            '/datafile/three_sim/terrain1.tif',
            '/public/datafile/three_sim/terrain1.tif'
        ], '地形DEM');
        const image = terrainResult.image;
        const rasters = terrainResult.rasters;
        const tiffWidth = image.getWidth();
        const tiffHeight = image.getHeight();
        const elevationData = new Float32Array(rasters[0]);

        const bbox = image.getBoundingBox();
        const bounds = {
            minLng: Math.min(bbox[0], bbox[2]),
            maxLng: Math.max(bbox[0], bbox[2]),
            minLat: Math.min(bbox[1], bbox[3]),
            maxLat: Math.max(bbox[1], bbox[3])
        };

        let minElevation = Infinity;
        let maxElevation = -Infinity;
        for (let i = 0; i < elevationData.length; i++) {
            const val = elevationData[i];
            if (val !== 0) {
                minElevation = Math.min(minElevation, val);
                maxElevation = Math.max(maxElevation, val);
            }
        }

        const heightData = new Float32Array(tiffWidth * tiffHeight);
        for (let i = 0; i < elevationData.length; i++) {
            heightData[i] = (elevationData[i] - minElevation) / (maxElevation - minElevation);
        }

        const heightDataRGBA = new Float32Array(tiffWidth * tiffHeight * 4);
        for (let i = 0; i < heightData.length; i++) {
            heightDataRGBA[i * 4] = heightData[i];
        }
        const heightTexture = new THREE.DataTexture(heightDataRGBA, tiffWidth, tiffHeight, THREE.RGBAFormat, THREE.FloatType);
        heightTexture.needsUpdate = true;
        heightTexture.minFilter = THREE.LinearFilter;
        heightTexture.magFilter = THREE.LinearFilter;

        const domResult = await readGeoTiffWithFallback([
            '/datafile/three_sim/1.tif',
            '/public/datafile/three_sim/1.tif'
        ], '正射影像');
        const domImage = domResult.image;
        const domRasters = domResult.rasters;
        const dWidth = domImage.getWidth();
        const dHeight = domImage.getHeight();
        const bands = domRasters.length;
        const domData = new Uint8Array(dWidth * dHeight * 4);
        for (let i = 0; i < dWidth * dHeight; i++) {
            if (bands >= 3) {
                domData[i * 4 + 0] = domRasters[0][i];
                domData[i * 4 + 1] = domRasters[1][i];
                domData[i * 4 + 2] = domRasters[2][i];
                domData[i * 4 + 3] = bands >= 4 ? domRasters[3][i] : 255;
            } else {
                const val = domRasters[0][i];
                domData[i * 4 + 0] = val;
                domData[i * 4 + 1] = val;
                domData[i * 4 + 2] = val;
                domData[i * 4 + 3] = 255;
            }
        }
        const domTexture = new THREE.DataTexture(domData, dWidth, dHeight, THREE.RGBAFormat, THREE.UnsignedByteType);
        domTexture.minFilter = THREE.LinearFilter;
        domTexture.magFilter = THREE.LinearFilter;
        domTexture.needsUpdate = true;

        const simHeightData = new Float32Array(tiffWidth * tiffHeight * 4);
        simHeightData.set(heightDataRGBA);
        const simHeightTexture = new THREE.DataTexture(simHeightData, tiffWidth, tiffHeight, THREE.RGBAFormat, THREE.FloatType);
        simHeightTexture.needsUpdate = true;
        simHeightTexture.minFilter = THREE.NearestFilter;
        simHeightTexture.magFilter = THREE.NearestFilter;

        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        function createRenderTarget(useLinear) {
            return new THREE.WebGLRenderTarget(tiffWidth, tiffHeight, {
                minFilter: useLinear ? THREE.LinearFilter : THREE.NearestFilter,
                magFilter: useLinear ? THREE.LinearFilter : THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType,
                depthBuffer: false,
                stencilBuffer: false
            });
        }

        let rtWater = [createRenderTarget(true), createRenderTarget(true)];
        let rtFlux = [createRenderTarget(false), createRenderTarget(false)];
        let rtPollution = [createRenderTarget(true), createRenderTarget(true)];
        let currentBuffer = 0;

        renderer.setClearColor(new THREE.Color(0, 0, 0), 0);
        renderer.setRenderTarget(rtPollution[0]);
        renderer.clear();
        renderer.setRenderTarget(rtPollution[1]);
        renderer.clear();
        renderer.setRenderTarget(null);

        const gpgpuScene = new THREE.Scene();
        const gpgpuCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const gpgpuQuad = new THREE.PlaneGeometry(2, 2);

        const {
            createFluxShader,
            createWaterShader,
            createWaterRenderMaterial,
            createGPGPUMaterial,
            createPollutionShader
        } = window.FluidShaders;

        const terrainAspect = tiffHeight / tiffWidth;
        const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE * terrainAspect, tiffWidth - 1, tiffHeight - 1);
        const terrainMat = new THREE.ShaderMaterial({
            uniforms: {
                uPollutionTex: { value: null },
                uWaterTex: { value: null },
                uTerrainTex: { value: domTexture },
                uHasTerrainTex: { value: 1.0 },
                uTerrainColor: { value: new THREE.Color(0x3a5f3a) },
                uPollutionColor: { value: new THREE.Color(0x8b4513) },
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
                uniform sampler2D uTerrainTex;
                uniform float uHasTerrainTex;
                uniform vec3 uTerrainColor;
                uniform vec3 uPollutionColor;
                uniform vec3 uLightDir;
                uniform float uAmbient;
                uniform float uDiffuse;

                varying vec3 vNormal;
                varying vec2 vUv;

                void main() {
                    vec2 flippedUV = vec2(vUv.x, 1.0 - vUv.y);
                    vec3 baseColor = uTerrainColor;
                    if (uHasTerrainTex > 0.5) {
                        baseColor = texture2D(uTerrainTex, flippedUV).rgb;
                    }
                    float pollutionAmount = texture2D(uPollutionTex, flippedUV).r;
                    float pollutionStrength = smoothstep(0.002, 0.15, pollutionAmount);
                    vec3 finalColor = mix(baseColor, uPollutionColor, pollutionStrength * 0.7);

                    vec3 lightDir = normalize(uLightDir);
                    float diff = max(dot(vNormal, lightDir), 0.0);
                    vec3 color = finalColor * (uAmbient + uDiffuse * diff);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });

        const posAttr = terrainGeo.attributes.position.array;
        for (let i = 0; i < heightData.length; i++) {
            posAttr[i * 3 + 2] = heightData[i] * HEIGHT_SCALE;
        }
        terrainGeo.computeVertexNormals();

        const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
        terrainMesh.rotation.x = -Math.PI / 2;
        terrainMat.uniforms.uPollutionTex.value = rtPollution[0].texture;
        terrainMat.uniforms.uWaterTex.value = rtWater[0].texture;
        scene.add(terrainMesh);

        const fluxShader = createFluxShader();
        const fluxUniforms = {
            uWaterTex: { value: null },
            uHeightTex: { value: simHeightTexture },
            uFluxTex: { value: null },
            uResolution: { value: new THREE.Vector2(tiffWidth, tiffHeight) },
            uDt: { value: params.dt },
            uGravity: { value: params.gravity },
            uPipeArea: { value: params.pipeArea },
            uPipeLength: { value: params.pipeLength }
        };
        const fluxMaterial = createGPGPUMaterial(fluxShader, fluxUniforms);
        const fluxMesh = new THREE.Mesh(gpgpuQuad, fluxMaterial);

        const waterShader = createWaterShader();
        const waterUniforms = {
            uWaterTex: { value: null },
            uFluxTex: { value: null },
            uHeightTex: { value: simHeightTexture },
            uResolution: { value: new THREE.Vector2(tiffWidth, tiffHeight) },
            uDt: { value: params.dt },
            uPipeLength: { value: params.pipeLength },
            uInjectActive: { value: false },
            uInjectPos: { value: new THREE.Vector2(-1, -1) },
            uInjectRadius: { value: params.injectRadius },
            uInjectAmount: { value: params.injectAmount },
            uEvaporation: { value: 1.0 - params.evaporation },
            uSlopeDir: { value: new THREE.Vector2(0, 0) }
        };
        const waterMaterial = createGPGPUMaterial(waterShader, waterUniforms);
        const waterMesh = new THREE.Mesh(gpgpuQuad.clone(), waterMaterial);

        const pollutionShader = createPollutionShader();
        const pollutionUniforms = {
            uPollutionTex: { value: null },
            uWaterTex: { value: null },
            uPollutionRate: { value: 0.3 },
            uDecayRate: { value: 0.00001 }
        };
        const pollutionMaterial = createGPGPUMaterial(pollutionShader, pollutionUniforms);
        const pollutionMesh = new THREE.Mesh(gpgpuQuad.clone(), pollutionMaterial);

        const waterGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE * terrainAspect, tiffWidth * 2 - 1, tiffHeight * 2 - 1);
        const waterRenderMat = createWaterRenderMaterial();
        waterRenderMat.uniforms.uHeightTex.value = heightTexture;
        waterRenderMat.uniforms.uHeightScale.value = HEIGHT_SCALE;
        waterRenderMat.uniforms.uMaxDepth.value = 0.05;
        waterRenderMat.uniforms.uResolution.value.set(tiffWidth, tiffHeight);
        waterRenderMat.uniforms.uTerrainSize.value = TERRAIN_SIZE;
        waterRenderMat.uniforms.uLightDir.value.copy(dirLight.position).normalize();
        waterRenderMat.uniforms.uSpecularColor.value.setHex(0xffffff);
        waterRenderMat.uniforms.uShininess.value = 100.0;

        const waterSurface = new THREE.Mesh(waterGeo, waterRenderMat);
        waterSurface.rotation.x = -Math.PI / 2;
        waterSurface.position.y = 0.001;
        scene.add(waterSurface);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let isInjecting = false;
        let injectUV = new THREE.Vector2();

        function getMouseNDC(event) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }

        function calculateSlopeDirection(u, v) {
            const texelX = 1 / tiffWidth;
            const texelY = 1 / tiffHeight;
            const ix = Math.floor(u * tiffWidth);
            const iy = Math.floor(v * tiffHeight);

            const getHeight = function (x, y) {
                x = Math.max(0, Math.min(tiffWidth - 1, x));
                y = Math.max(0, Math.min(tiffHeight - 1, y));
                return simHeightData[(y * tiffWidth + x) * 4];
            };

            const hR = getHeight(ix + 1, iy);
            const hL = getHeight(ix - 1, iy);
            const hT = getHeight(ix, iy + 1);
            const hB = getHeight(ix, iy - 1);

            const gradX = -(hR - hL) * texelX;
            const gradY = -(hT - hB) * texelY;
            const len = Math.sqrt(gradX * gradX + gradY * gradY);
            if (len > 1e-6) {
                return new THREE.Vector2(gradX / len, gradY / len);
            }
            return new THREE.Vector2(0, 0);
        }

        function resetSimulation() {
            renderer.setClearColor(new THREE.Color(0, 0, 0), 0);
            renderer.setRenderTarget(rtWater[0]);
            renderer.clear();
            renderer.setRenderTarget(rtWater[1]);
            renderer.clear();
            renderer.setRenderTarget(rtFlux[0]);
            renderer.clear();
            renderer.setRenderTarget(rtFlux[1]);
            renderer.clear();
            renderer.setRenderTarget(rtPollution[0]);
            renderer.clear();
            renderer.setRenderTarget(rtPollution[1]);
            renderer.clear();
            renderer.setRenderTarget(null);
        }

        // 使用 click 事件，但通过 mousedown 记录起始位置来过滤拖拽后的误触
        let _mouseDownX = 0, _mouseDownY = 0;
        const _DRAG_THRESHOLD = 5; // 像素，超过此距离视为拖拽

        function onTerrainMouseDown(event) {
            if (event.button !== 0) return;
            _mouseDownX = event.clientX;
            _mouseDownY = event.clientY;
        }

        function onTerrainClick(event) {
            if (event.button !== 0) return;
            // 若移动距离超过阈值，视为拖拽（旋转/平移），不触发注水
            const dx = event.clientX - _mouseDownX;
            const dy = event.clientY - _mouseDownY;
            if (dx * dx + dy * dy > _DRAG_THRESHOLD * _DRAG_THRESHOLD) return;

            getMouseNDC(event);
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(terrainMesh);
            if (intersects.length > 0) {
                resetSimulation();
                const uv = intersects[0].uv;
                injectUV.set(uv.x, 1.0 - uv.y);
                const slopeDir = calculateSlopeDirection(uv.x, 1.0 - uv.y);
                waterUniforms.uSlopeDir.value.copy(slopeDir);
                waterUniforms.uInjectActive.value = true;
                waterUniforms.uInjectPos.value.copy(injectUV);
                // 模拟 mousedown 后立即 mouseup：下一帧关闭注水
                requestAnimationFrame(function() {
                    waterUniforms.uInjectActive.value = false;
                    isInjecting = false;
                });
            }
        }

        renderer.domElement.addEventListener('mousedown', onTerrainMouseDown);
        renderer.domElement.addEventListener('click', onTerrainClick);

        // ================================================================
        // 河流裁剪并绘制到 三维场景模拟（参考 t4.html cal_riv_intersects）
        // ================================================================

        // 线段相交（等同于 t4.html lineSegmentsIntersect）
        function _tsSegIntersect(seg1, seg2, eps) {
            eps = eps || 1e-10;
            const p1=seg1[0],p2=seg1[1],p3=seg2[0],p4=seg2[1];
            const d1x=p2[0]-p1[0], d1y=p2[1]-p1[1];
            const d2x=p4[0]-p3[0], d2y=p4[1]-p3[1];
            const denom=d1x*d2y-d1y*d2x;
            if(Math.abs(denom)<eps) return {intersects:false};
            const t=((p3[0]-p1[0])*d2y-(p3[1]-p1[1])*d2x)/denom;
            const u=((p3[0]-p1[0])*d1y-(p3[1]-p1[1])*d1x)/denom;
            if(t>eps&&t<1-eps&&u>eps&&u<1-eps){
                return {intersects:true,intersectionPoint:[p1[0]+t*d1x,p1[1]+t*d1y]};
            }
            return {intersects:false};
        }

        // 生成 bbox 四条边（等同于 t4.html c_bbox_line）
        function _tsBboxEdges(minX,minY,maxX,maxY){
            return [[[minX,minY],[minX,maxY]],[[minX,maxY],[maxX,maxY]],
                    [[maxX,maxY],[maxX,minY]],[[maxX,minY],[minX,minY]]];
        }

        // 点是否严格在 bbox 内（不含边界）
        function _tsPtInBbox(lng,lat,minX,minY,maxX,maxY){
            return lng>minX&&lng<maxX&&lat>minY&&lat<maxY;
        }

        // 河流坐标范围是否与 bbox 有覆盖
        function _tsRivBboxOverlap(coords,minX,minY,maxX,maxY){
            let rMinX=Infinity,rMinY=Infinity,rMaxX=-Infinity,rMaxY=-Infinity;
            for(let i=0;i<coords.length;i++){
                if(coords[i][0]<rMinX) rMinX=coords[i][0];
                if(coords[i][0]>rMaxX) rMaxX=coords[i][0];
                if(coords[i][1]<rMinY) rMinY=coords[i][1];
                if(coords[i][1]>rMaxY) rMaxY=coords[i][1];
            }
            return rMinX<=maxX&&rMaxX>=minX&&rMinY<=maxY&&rMaxY>=minY;
        }

        // 将 allRiver（格式：[[lng,lat],...] 坐标数组）裁剪到 bounds 矩形内
        // 返回：[{ pts:[[lng,lat],...], name:string }, ...]
        // 逻辑完全对应 t4.html 的 cal_riv_intersects（case 1~9）
        function _tsCalRivClip(allRiverData, minX, minY, maxX, maxY) {
            const result = [];
            const bboxEdges = _tsBboxEdges(minX,minY,maxX,maxY);

            allRiverData.forEach(function(river) {
                const raw_coords = river[0]; // [[lng,lat],...]
                const riv_name   = river[1];
                if(!raw_coords||raw_coords.length<2) return;
                if(!_tsRivBboxOverlap(raw_coords,minX,minY,maxX,maxY)) return;

                // 转成 {lng,lat} 与 t4.html 接口一致
                const riv_coords = raw_coords.map(function(p){return {lng:p[0],lat:p[1]};});

                const point_in_bbox_list=[], p_index=[];
                for(let i=0;i<riv_coords.length;i++){
                    const p=riv_coords[i];
                    if(_tsPtInBbox(p.lng,p.lat,minX,minY,maxX,maxY)){
                        if(p.lng!==minX&&p.lng!==maxX&&p.lat!==minY&&p.lat!==maxY){
                            point_in_bbox_list.push(p);
                            p_index.push(i);
                        }
                    }
                }

                // ---- case 9：河流穿越但无折点在 bbox 内 ----
                if(p_index.length===0){
                    const cross_pts=[];
                    for(let i=0;i<riv_coords.length-1;i++){
                        const sLine=[[riv_coords[i].lng,riv_coords[i].lat],[riv_coords[i+1].lng,riv_coords[i+1].lat]];
                        bboxEdges.forEach(function(l){
                            const ins=_tsSegIntersect(sLine,l);
                            if(ins.intersects){
                                const dx=ins.intersectionPoint[0]-riv_coords[i].lng;
                                const dy=ins.intersectionPoint[1]-riv_coords[i].lat;
                                cross_pts.push([ins.intersectionPoint,dx*dx+dy*dy]);
                            }
                        });
                    }
                    cross_pts.sort(function(a,b){return a[1]-b[1];});
                    if(cross_pts.length>=2){
                        result.push({pts:[cross_pts[0][0],cross_pts[1][0]],name:riv_name});
                    }
                    return;
                }

                // 判断是否反复穿插（t4.html isSingleLine 判断）
                let isSingleLine=true;
                for(let i=0;i<p_index.length-1;i++){
                    if(p_index[i]+1!==p_index[i+1]){isSingleLine=false;break;}
                }

                if(!isSingleLine){
                    // ---------- 复杂情况（cases 1~4）----------
                    const c1=p_index[0]===0, c2=p_index.at(-1)===riv_coords.length-1;
                    let near_bounds=[];

                    if(c1&&c2){
                        // case 1：起、终点都在 bbox 内
                        for(let i=0;i<p_index.length-1;i++){
                            if(p_index[i]+1!==p_index[i+1]){near_bounds.push(p_index[i]);near_bounds.push(p_index[i+1]);}
                        }
                        const crossLines=[];
                        for(let i=0;i<near_bounds.length;i++){
                            if(i%2===0) crossLines.push([[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat],[riv_coords[near_bounds[i]+1].lng,riv_coords[near_bounds[i]+1].lat]]);
                            else        crossLines.push([[riv_coords[near_bounds[i]-1].lng,riv_coords[near_bounds[i]-1].lat],[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat]]);
                        }
                        near_bounds.unshift(0); near_bounds.push(riv_coords.length-1);
                        const cpt=[];
                        crossLines.forEach(function(cl){bboxEdges.forEach(function(l){const ins=_tsSegIntersect(cl,l);if(ins.intersects)cpt.push(ins.intersectionPoint);});});
                        for(let i=0;i<near_bounds.length/2;i++){
                            const sl=riv_coords.slice(near_bounds[i*2],near_bounds[i*2+1]+1).map(function(p){return [p.lng,p.lat];});
                            if(i===0) sl.push(cpt[i]);
                            else if(i===near_bounds.length/2-1) sl.unshift(cpt[i*2-1]);
                            else{sl.unshift(cpt[i*2-1]);sl.push(cpt[i*2]);}
                            result.push({pts:sl,name:riv_name});
                        }
                    } else if(!c1&&c2){
                        // case 2：只有终点在 bbox 内
                        near_bounds.push(p_index[0]);
                        for(let i=0;i<p_index.length-1;i++){
                            if(p_index[i]+1!==p_index[i+1]){near_bounds.push(p_index[i]);near_bounds.push(p_index[i+1]);}
                        }
                        near_bounds.push(riv_coords.length-1);
                        const crossLines=[];
                        for(let i=0;i<near_bounds.length;i++){
                            if(i%2===0) crossLines.push([[riv_coords[near_bounds[i]-1].lng,riv_coords[near_bounds[i]-1].lat],[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat]]);
                            else        crossLines.push([[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat],[riv_coords[near_bounds[i]+1].lng,riv_coords[near_bounds[i]+1].lat]]);
                        }
                        const cpt=[];
                        crossLines.forEach(function(cl){bboxEdges.forEach(function(l){const ins=_tsSegIntersect(cl,l);if(ins.intersects)cpt.push(ins.intersectionPoint);});});
                        for(let i=0;i<near_bounds.length/2;i++){
                            const sl=riv_coords.slice(near_bounds[i*2],near_bounds[i*2+1]+1).map(function(p){return [p.lng,p.lat];});
                            if(i===near_bounds.length/2-1) sl.unshift(cpt[i*2]);
                            else{sl.unshift(cpt[i*2]);sl.push(cpt[i*2+1]);}
                            result.push({pts:sl,name:riv_name});
                        }
                    } else if(c1&&!c2){
                        // case 3：只有起点在 bbox 内
                        for(let i=0;i<p_index.length-1;i++){
                            if(p_index[i]+1!==p_index[i+1]){near_bounds.push(p_index[i]);near_bounds.push(p_index[i+1]);}
                        }
                        near_bounds.push(p_index.at(-1));
                        const crossLines=[];
                        for(let i=0;i<near_bounds.length;i++){
                            if(i%2===0) crossLines.push([[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat],[riv_coords[near_bounds[i]+1].lng,riv_coords[near_bounds[i]+1].lat]]);
                            else        crossLines.push([[riv_coords[near_bounds[i]-1].lng,riv_coords[near_bounds[i]-1].lat],[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat]]);
                        }
                        near_bounds.unshift(p_index[0]);
                        const cpt=[];
                        crossLines.forEach(function(cl){bboxEdges.forEach(function(l){const ins=_tsSegIntersect(cl,l);if(ins.intersects)cpt.push(ins.intersectionPoint);});});
                        for(let i=0;i<near_bounds.length/2;i++){
                            const sl=riv_coords.slice(near_bounds[i*2],near_bounds[i*2+1]+1).map(function(p){return [p.lng,p.lat];});
                            if(i===0) sl.push(cpt[i*2]);
                            else{sl.unshift(cpt[i*2-1]);sl.push(cpt[i*2]);}
                            result.push({pts:sl,name:riv_name});
                        }
                    } else {
                        // case 4：起、终点都不在 bbox 内
                        near_bounds.push(p_index[0]);
                        for(let i=0;i<p_index.length-1;i++){
                            if(p_index[i]+1!==p_index[i+1]){near_bounds.push(p_index[i]);near_bounds.push(p_index[i+1]);}
                        }
                        near_bounds.push(p_index.at(-1));
                        const crossLines=[];
                        for(let i=0;i<near_bounds.length;i++){
                            if(i%2===0) crossLines.push([[riv_coords[near_bounds[i]-1].lng,riv_coords[near_bounds[i]-1].lat],[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat]]);
                            else        crossLines.push([[riv_coords[near_bounds[i]].lng,riv_coords[near_bounds[i]].lat],[riv_coords[near_bounds[i]+1].lng,riv_coords[near_bounds[i]+1].lat]]);
                        }
                        const cpt=[];
                        crossLines.forEach(function(cl){bboxEdges.forEach(function(l){const ins=_tsSegIntersect(cl,l);if(ins.intersects)cpt.push(ins.intersectionPoint);});});
                        for(let i=0;i<near_bounds.length/2;i++){
                            const sl=riv_coords.slice(near_bounds[i*2],near_bounds[i*2+1]+1).map(function(p){return [p.lng,p.lat];});
                            sl.unshift(cpt[i*2]); sl.push(cpt[i*2+1]);
                            result.push({pts:sl,name:riv_name});
                        }
                    }
                } else {
                    // ---------- 简单情况（cases 5~8）----------
                    const pts=point_in_bbox_list.map(function(p){return [p.lng,p.lat];});
                    const c1=p_index[0]===0, c2=p_index.at(-1)===riv_coords.length-1;
                    if(pts.length===riv_coords.length){
                        // case 5：所有点都在 bbox 内
                        result.push({pts:pts,name:riv_name});
                    } else if(!c1&&c2){
                        // case 6：只有终点在 bbox 内
                        const inLine=[[riv_coords[p_index[0]-1].lng,riv_coords[p_index[0]-1].lat],[riv_coords[p_index[0]].lng,riv_coords[p_index[0]].lat]];
                        bboxEdges.forEach(function(l){const ins=_tsSegIntersect(inLine,l);if(ins.intersects)pts.unshift(ins.intersectionPoint);});
                        result.push({pts:pts,name:riv_name});
                    } else if(c1&&!c2){
                        // case 7：只有起点在 bbox 内
                        const inLine=[[riv_coords[p_index.at(-1)].lng,riv_coords[p_index.at(-1)].lat],[riv_coords[p_index.at(-1)+1].lng,riv_coords[p_index.at(-1)+1].lat]];
                        bboxEdges.forEach(function(l){const ins=_tsSegIntersect(inLine,l);if(ins.intersects)pts.push(ins.intersectionPoint);});
                        result.push({pts:pts,name:riv_name});
                    } else {
                        // case 8：起、终点都不在 bbox 内
                        const inLine1=[[riv_coords[p_index[0]-1].lng,riv_coords[p_index[0]-1].lat],[riv_coords[p_index[0]].lng,riv_coords[p_index[0]].lat]];
                        const inLine2=[[riv_coords[p_index.at(-1)].lng,riv_coords[p_index.at(-1)].lat],[riv_coords[p_index.at(-1)+1].lng,riv_coords[p_index.at(-1)+1].lat]];
                        bboxEdges.forEach(function(l){
                            const ins1=_tsSegIntersect(inLine1,l); if(ins1.intersects) pts.unshift(ins1.intersectionPoint);
                            const ins2=_tsSegIntersect(inLine2,l); if(ins2.intersects) pts.push(ins2.intersectionPoint);
                        });
                        result.push({pts:pts,name:riv_name});
                    }
                }
            });
            return result;
        }

        // 将裁剪后的河流绘制到 三维场景模拟
        // 高度通过直接采样内存中的 heightData 获得（O(1)/点），不使用 raycasting
        // 坐标转换公式参考 t4.html c_polyline_riv_animate
        let _riverFlowMaterial = null; // 动态河流材质，供 animate 每帧更新 dashOffset
        function _tsDrawRivers(clippedRivList) {
            if(!clippedRivList||clippedRivList.length===0) return;
            const geoWidth   = bounds.maxLng - bounds.minLng;
            const geoHeight  = bounds.maxLat - bounds.minLat;
            const dem_width  = TERRAIN_SIZE;
            const dem_height = TERRAIN_SIZE * terrainAspect;

            // 双线性插值采样 heightData（已归一化到 [0,1]）
            function sampleHeight(lng, lat) {
                const col_f = (lng - bounds.minLng) / geoWidth  * (tiffWidth  - 1);
                const row_f = (bounds.maxLat - lat) / geoHeight * (tiffHeight - 1);
                const c0 = Math.max(0, Math.min(tiffWidth  - 2, Math.floor(col_f)));
                const r0 = Math.max(0, Math.min(tiffHeight - 2, Math.floor(row_f)));
                const c1 = c0 + 1, r1 = r0 + 1;
                const tc = col_f - c0, tr = row_f - r0;
                const h00 = heightData[r0 * tiffWidth + c0];
                const h10 = heightData[r0 * tiffWidth + c1];
                const h01 = heightData[r1 * tiffWidth + c0];
                const h11 = heightData[r1 * tiffWidth + c1];
                return (h00*(1-tc)*(1-tr) + h10*tc*(1-tr) + h01*(1-tc)*tr + h11*tc*tr) * HEIGHT_SCALE;
            }

            // 使用自定义 ShaderMaterial + uTime uniform 实现可靠的流动效果
            // （LineDashedMaterial 的 dashOffset 在部分 three.js 版本中无法正确驱动动画）
            const baseMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTime:     { value: 0.0 },
                    uDashSize: { value: 0.18 },
                    uGapSize:  { value: 0.09 },
                    uColor:    { value: new THREE.Color(0x44aaff) }
                },
                vertexShader: [
                    'attribute float lineDistance;',
                    'varying float vLineDist;',
                    'void main() {',
                    '    vLineDist = lineDistance;',
                    '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                    '}'
                ].join('\n'),
                fragmentShader: [
                    'uniform float uTime;',
                    'uniform float uDashSize;',
                    'uniform float uGapSize;',
                    'uniform vec3  uColor;',
                    'varying float vLineDist;',
                    'void main() {',
                    '    float total = uDashSize + uGapSize;',
                    '    float pos = mod(vLineDist - uTime, total);',
                    '    if (pos > uDashSize) discard;',
                    '    gl_FragColor = vec4(uColor, 1.0);',
                    '}'
                ].join('\n'),
                depthTest: false,
                transparent: false
            });
            _riverFlowMaterial = baseMaterial;
            const riverGroup = new THREE.Group();
            riverGroup.name = 'ts_river_group';

            // 创建河流名称文字 Sprite
            function createRiverLabelSprite(name) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const fontSize = 12;
                ctx.font = `bold ${fontSize}px sans-serif`;
                const textW = ctx.measureText(name).width;
                const padX = 10, padY = 6;
                canvas.width  = textW + padX * 2;
                canvas.height = fontSize + padY * 2;
                // 半透明背景
                ctx.fillStyle = 'rgba(0,30,60,0.55)';
                ctx.beginPath();
                ctx.roundRect(0, 0, canvas.width, canvas.height, 4);
                ctx.fill();
                // 文字
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = '#7dd6ff';
                ctx.fillText(name, padX, fontSize + padY - 4);
                const texture = new THREE.CanvasTexture(canvas);
                const mat = new THREE.SpriteMaterial({
                    map: texture,
                    depthTest: false,
                    transparent: true
                });
                const sprite = new THREE.Sprite(mat);
                // 保持合适的显示比例
                const scale = 0.14;
                sprite.scale.set(canvas.width / canvas.height * scale, scale, 1);
                return sprite;
            }

            // 收集所有已显示名称，避免重复标注同名河流
            const _labeledNames = new Set();

            clippedRivList.forEach(function(riv){
                const pts3d = [];
                for(let j=0;j<riv.pts.length;j++){
                    const lng = riv.pts[j][0], lat = riv.pts[j][1];
                    // 等同于 t4.html three_pos_x_trans / three_pos_z_trans
                    const wx = ((lng - bounds.minLng) / geoWidth)  * dem_width  - dem_width  / 2;
                    const wz = dem_height / 2 - ((lat - bounds.minLat) / geoHeight) * dem_height;
                    const wy = sampleHeight(lng, lat) + 0.025; // 略高于地面
                    pts3d.push(new THREE.Vector3(wx, wy, wz));
                }
                if(pts3d.length>=2){
                    // ShaderMaterial 使用 lineDistance 属性驱动虚线，需调用 computeLineDistances()
                    const line = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints(pts3d),
                        baseMaterial
                    );
                    line.computeLineDistances();
                    riverGroup.add(line);

                    // 在河流中点位置添加名称标签（同名河流只标一次）
                    if(riv.name && !_labeledNames.has(riv.name)){
                        _labeledNames.add(riv.name);
                        const midIdx = Math.floor(pts3d.length / 2);
                        const midPt  = pts3d[midIdx];
                        const sprite = createRiverLabelSprite(riv.name);
                        sprite.position.set(midPt.x, midPt.y + 0.15, midPt.z);
                        riverGroup.add(sprite);
                    }
                }
            });
            scene.add(riverGroup);
            state.cleanupFns.push(function(){
                scene.remove(riverGroup);
                riverGroup.children.forEach(function(c){
                    if(c.geometry) c.geometry.dispose();
                    if(c.material){
                        if(c.material.map) c.material.map.dispose();
                        c.material.dispose();
                    }
                });
                baseMaterial.dispose();
                _riverFlowMaterial = null;
            });
        }

        // 延迟到场景首帧渲染后再执行裁剪+绘制，避免阻塞启动
        setTimeout(function(){
            if(!state.running) return;
            const _allRiv=(typeof allRiver!=='undefined')?allRiver:(window.allRiver||[]);
            if(_allRiv.length>0){
                try {
                    const clipped=_tsCalRivClip(_allRiv, bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat);
                    _tsDrawRivers(clipped);
                } catch(e){ console.warn('threeSim 河流绘制失败', e); }
            }
        }, 300);

        function simulationStep() {
            const curr = currentBuffer;
            const next = 1 - curr;

            gpgpuScene.clear();
            gpgpuScene.add(fluxMesh);
            fluxUniforms.uWaterTex.value = rtWater[curr].texture;
            fluxUniforms.uFluxTex.value = rtFlux[curr].texture;
            renderer.setRenderTarget(rtFlux[next]);
            renderer.render(gpgpuScene, gpgpuCamera);

            gpgpuScene.clear();
            gpgpuScene.add(waterMesh);
            waterUniforms.uWaterTex.value = rtWater[curr].texture;
            waterUniforms.uFluxTex.value = rtFlux[next].texture;
            renderer.setRenderTarget(rtWater[next]);
            renderer.render(gpgpuScene, gpgpuCamera);

            gpgpuScene.clear();
            gpgpuScene.add(pollutionMesh);
            pollutionUniforms.uPollutionTex.value = rtPollution[curr].texture;
            pollutionUniforms.uWaterTex.value = rtWater[next].texture;
            renderer.setRenderTarget(rtPollution[next]);
            renderer.render(gpgpuScene, gpgpuCamera);

            currentBuffer = next;
            waterRenderMat.uniforms.uWaterTex.value = rtWater[currentBuffer].texture;
            terrainMat.uniforms.uPollutionTex.value = rtPollution[currentBuffer].texture;
            terrainMat.uniforms.uWaterTex.value = rtWater[currentBuffer].texture;
        }

        let _pollutionFrameCount = 0;
        const _pollutionOverlayInterval = 4; // 每 4 帧更新一次地图叠加层
        const _pollutionPixelBuf = new Float32Array(tiffWidth * tiffHeight * 4);
        const _pollutionTmpCanvas = document.createElement('canvas');
        _pollutionTmpCanvas.width = tiffWidth;
        _pollutionTmpCanvas.height = tiffHeight;

        function drawPollutionOverlay() {
            _pollutionFrameCount++;
            if (_pollutionFrameCount % _pollutionOverlayInterval !== 0) return;
            if (!pollutionOverlayCanvas || !bounds) return;

            const canvasW = pollutionOverlayCanvas.width;
            const canvasH = pollutionOverlayCanvas.height;
            if (canvasW <= 0 || canvasH <= 0) return;

            try {
                renderer.readRenderTargetPixels(
                    rtPollution[currentBuffer],
                    0, 0, tiffWidth, tiffHeight,
                    _pollutionPixelBuf
                );
            } catch (e) {
                return;
            }

            // 将污染纹理数据写入临时 canvas
            const tmpCtx = _pollutionTmpCanvas.getContext('2d');
            const imgData = tmpCtx.createImageData(tiffWidth, tiffHeight);
            const d = imgData.data;
            const total = tiffWidth * tiffHeight;
            for (let i = 0; i < total; i++) {
                // rtPollution 存储在 R 通道（Float，范围 0~N）
                const pollution = _pollutionPixelBuf[i * 4];
                if (pollution < 0.001) {
                    d[i * 4 + 3] = 0;
                    continue;
                }
                // 棕黄色污染面
                const alpha = Math.min(255, Math.round(pollution * 1800));
                d[i * 4 + 0] = 200;   // R
                d[i * 4 + 1] = 60;    // G
                d[i * 4 + 2] = 0;     // B
                d[i * 4 + 3] = alpha; // A
            }
            tmpCtx.putImageData(imgData, 0, 0);

            // 将 TIFF 地理范围映射到 mapDiv 像素坐标
            const ctx = pollutionOverlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, canvasW, canvasH);
            try {
                // T.Map API：lngLatToContainerPoint 返回相对于 mapDiv 左上角的像素点
                const ptMin = map.lngLatToContainerPoint(new T.LngLat(bounds.minLng, bounds.minLat));
                const ptMax = map.lngLatToContainerPoint(new T.LngLat(bounds.maxLng, bounds.maxLat));
                const topHeader = document.querySelector('.topheader');
                const headerH = topHeader ? topHeader.offsetHeight : 0;
                const rx = Math.round(ptMin.x);
                const ry = Math.round(ptMax.y) - headerH; // canvas 从 topheader 下方开始，坐标需减去 headerH
                const rw = Math.round(ptMax.x - ptMin.x);
                const rh = Math.round(ptMin.y - ptMax.y);
                if (rw > 0 && rh > 0) {
                    ctx.globalAlpha = 0.75;
                    ctx.drawImage(_pollutionTmpCanvas, rx, ry, rw, rh);
                    ctx.globalAlpha = 1.0;
                }
            } catch (e) {
                // 地图 API 不可用时跳过
            }
        }

        function animate() {
            if (!state.running) {
                return;
            }
            state.animationId = requestAnimationFrame(animate);
            for (let i = 0; i < 5; i++) {
                simulationStep();
            }
            // 每帧递增 uTime，驱动 shader 中的虚线偏移，使河流产生向前流动的动态效果
            if (_riverFlowMaterial) {
                _riverFlowMaterial.uniforms.uTime.value += 0.001;
            }
            controls.update();
            renderer.setRenderTarget(null);
            renderer.render(scene, camera);
            drawPollutionOverlay();
        }

        function onResize() {
            if (!state.root || !state.camera || !state.renderer) {
                return;
            }
            updateRootPanelSize();
            const w = state.root.clientWidth;
            const h = state.root.clientHeight;
            if (w <= 0 || h <= 0) {
                return;
            }
            state.camera.aspect = w / h;
            state.camera.updateProjectionMatrix();
            state.renderer.setSize(w, h);
            resizePollutionCanvas();
        }

        window.addEventListener('resize', onResize);

        // 缩放时隐藏污染面，缩放结束后重新对齐并显示
        function onMapZoomStart() {
            pollutionOverlayCanvas.style.display = 'none';
        }
        function onMapZoomEnd() {
            resizePollutionCanvas();
            _pollutionFrameCount = 0; // 下一帧立即重绘
            pollutionOverlayCanvas.style.display = '';
        }
        map.addEventListener('zoomstart', onMapZoomStart);
        map.addEventListener('zoomend', onMapZoomEnd);

        state.cleanupFns.push(function () {
            window.removeEventListener('resize', onResize);
            map.removeEventListener('zoomstart', onMapZoomStart);
            map.removeEventListener('zoomend', onMapZoomEnd);
            renderer.domElement.removeEventListener('mousedown', onTerrainMouseDown);
            renderer.domElement.removeEventListener('click', onTerrainClick);
            // 移除污染面叠加 Canvas
            if (pollutionOverlayCanvas && pollutionOverlayCanvas.parentNode) {
                pollutionOverlayCanvas.parentNode.removeChild(pollutionOverlayCanvas);
            }
            rtWater[0].dispose();
            rtWater[1].dispose();
            rtFlux[0].dispose();
            rtFlux[1].dispose();
            rtPollution[0].dispose();
            rtPollution[1].dispose();
            terrainGeo.dispose();
            terrainMat.dispose();
            waterGeo.dispose();
            waterRenderMat.dispose();
            fluxMaterial.dispose();
            waterMaterial.dispose();
            pollutionMaterial.dispose();
            heightTexture.dispose();
            domTexture.dispose();
            simHeightTexture.dispose();
        });

        state.root = root;
        state.renderer = renderer;
        state.scene = scene;
        state.camera = camera;
        state.controls = controls;
        state.terrainMesh = terrainMesh;
        state.running = true;
        state.bounds = bounds;
        animate();
        return bounds;
    }
}
