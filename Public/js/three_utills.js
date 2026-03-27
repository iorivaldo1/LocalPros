function calculateWMSSize(width, height, format = 'image/png', bands = 4) {
    const totalPixels = width * height;
    const bytesPerPixel = getBytesPerPixel(format, bands);
    const uncompressedSize = totalPixels * bytesPerPixel;
    const compressionRatio = getCompressionRatio(format);
    const estimatedSize = uncompressedSize * compressionRatio;

    return formatBytes(estimatedSize)
}
function getBytesPerPixel(format, bands) {
    const formatMap = {
        'image/png': bands,           // 通常 4 bytes/pixel (RGBA)
        'image/jpeg': 3,              // 通常 3 bytes/pixel (RGB)
        'image/gif': 1,               // 通常 1 byte/pixel (8-bit)
        'image/tiff': bands,          // 取决于配置
        'image/geotiff': bands
    };
    return formatMap[format.toLowerCase()] || bands;
}
function getCompressionRatio(format) {
    const ratioMap = {
        'image/png': 0.5,     // PNG 压缩率约 50%
        'image/jpeg': 0.1,    // JPEG 压缩率约 10%
        'image/gif': 0.3,     // GIF 压缩率约 30%
        'image/tiff': 0.8     // TIFF 压缩率较差
    };
    return ratioMap[format.toLowerCase()] || 0.5;
}
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return {
        value: Math.round(size * 100) / 100,
        unit: units[unitIndex],
        bytes: bytes
    };
}

async function initThree(scene, control, renderer, demUrl, domUrl, pointList, bounds, loadIndex) {
    deleteMesh(scene, 'mesh_n_arrow')
    deleteMesh(scene, 'mesh_fab')
    meshPointNameList.forEach(p => {
        deleteMesh(scene, p)
    })

    // 加载dem底座
    const demData = await fetch(demUrl)
    const demData2 = demData.clone()
    const mesh = await createDEMMesh_AWAIT(demData, camera, 'mesh_fab')
    scene.add(mesh) // scene.add 是同步的

    // 加载指北针
    const bbox_dem = new THREE.Box3().setFromObject(mesh);
    const compassMesh = await createCompassMesh(bbox_dem, 'N')
    scene.add(compassMesh) // scene.add 是同步的

    // 加载dom - 将 textureLoader.load 包装成 Promise
    await new Promise((resolve, reject) => {
        const textureLoader4 = new THREE.TextureLoader();
        textureLoader4.load(
            domUrl,
            function (texture) {
                mesh.material.map = texture
                mesh.material.side = THREE.DoubleSide
                mesh.material.needsUpdate = true
                resolve(); // 加载完成
            },
            undefined,
            function (error) {
                reject(error); // 加载失败
            }
        )
    })

    //创建point，y值为0
    const pointGeo = await createPointGeoWithZ(demData2, bbox_dem, pointList, bounds)
    pointGeo.forEach(p => {
        scene.add(p[0])
        meshPointNameList.push(p[1])
    })

    const labelList = await createBridgeLabel(pointGeo)

    labelList.forEach(l => {
        scene.add(l)
    })

    //最后显示窗口
    await new Promise((resolve, reject) => {
        layer.close(loadIndex)
        $('#threeCon1').css('visibility', 'visible')
        resolve();
    })

    function animate() {
        requestAnimationFrame(animate);
        updateSphereSizes(pointGeo)
        control.update();
        renderer.render(scene, camera);
    }
    animate();
}

async function initThreeMergeTile(scene, control, renderer, demUrl, tdtEvent, pointList, bounds, loadIndex) {
    deleteMesh(scene, 'mesh_n_arrow')
    deleteMesh(scene, 'mesh_fab')
    meshPointNameList.forEach(p => {
        deleteMesh(scene, p)
    })

    // 加载dem底座
    const demData = await fetch(demUrl)
    const demData2 = demData.clone()
    const mesh = await createDEMMesh_AWAIT(demData, camera, 'mesh_fab')
    scene.add(mesh) // scene.add 是同步的

    // 加载指北针
    const bbox_dem = new THREE.Box3().setFromObject(mesh);
    const compassMesh = await createCompassMesh(bbox_dem, 'N')
    scene.add(compassMesh) // scene.add 是同步的

    const domTile = await getMergePng(tdtEvent)

    // 加载dom - 将 textureLoader.load 包装成 Promise
    await new Promise((resolve, reject) => {
        const textureLoader4 = new THREE.TextureLoader();
        textureLoader4.load(
            domTile.toDataURL('image/png'),
            function (texture) {
                mesh.material.map = texture
                mesh.material.side = THREE.DoubleSide
                mesh.material.needsUpdate = true
                resolve(); // 加载完成
            },
            undefined,
            function (error) {
                reject(error); // 加载失败
            }
        )
    })

    //创建point，y值为0
    const pointGeo = await createPointGeoWithZ(demData2, bbox_dem, pointList, bounds)
    pointGeo.forEach(p => {
        scene.add(p[0])
        meshPointNameList.push(p[1])
    })

    const labelList = await createBridgeLabel(pointGeo)

    labelList.forEach(l => {
        scene.add(l)
    })

    //最后显示窗口
    await new Promise((resolve, reject) => {
        layer.close(loadIndex)
        $('#threeCon1').css('visibility', 'visible')
        resolve();
    })

    function animate() {
        requestAnimationFrame(animate);
        updateSphereSizes(pointGeo)
        control.update();
        renderer.render(scene, camera);
    }
    animate();
}

async function setSourceBounds(url, layerName) {
    const layerInfo = await getDetailedCapabilities(url, layerName)
    await drawBounds(layerInfo)
}

async function getDetailedCapabilities(url, layerName) {
    const _url = url;
    try {
        const response = await fetch(_url);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        // 解析所有图层
        var layerInfo;
        const layerElements = xmlDoc.getElementsByTagName("Layer");
        for (let layerElem of layerElements) {
            const name = layerElem.getElementsByTagName("Name")[0]?.textContent;

            if (name == layerName) {
                // 解析边界框
                const bbox = layerElem.getElementsByTagName("BoundingBox")[0];
                const boundingBox = bbox ? {
                    crs: bbox.getAttribute("CRS"),
                    minx: parseFloat(bbox.getAttribute("minx")),
                    miny: parseFloat(bbox.getAttribute("miny")),
                    maxx: parseFloat(bbox.getAttribute("maxx")),
                    maxy: parseFloat(bbox.getAttribute("maxy"))
                } : null;

                layerInfo = { layer_name: name, layer_boundingBox: boundingBox }
            }
        }

        return layerInfo
    } catch (error) {
        console.error('获取详细信息失败:', error);
        throw error;
    }
}

async function drawBounds(layerInfo) {
    const minX = layerInfo.layer_boundingBox.minx
    const minY = layerInfo.layer_boundingBox.miny
    const maxX = layerInfo.layer_boundingBox.maxx
    const maxY = layerInfo.layer_boundingBox.maxy
    const points = []
    points.push(new T.LngLat(minX, maxY))
    points.push(new T.LngLat(maxX, maxY))
    points.push(new T.LngLat(maxX, minY))
    points.push(new T.LngLat(minX, minY))
    points.push(new T.LngLat(minX, maxY))
    var line = new T.Polyline(points, {
        color: '#049ef4',
        weight: 1.0,
        opacity: 0.7,
        lineStyle: 'dashed'
    });
    map.addOverLay(line);
}

function createSceneWithCamera(dom) {
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000000);
    camera.position.set(1, 0, 3);
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);

    const loader = new THREE.TextureLoader();
    const texture = loader.load(
        '/Public/imgs/three/bg1.jpeg',
        () => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            scene.background = texture;
        });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    const container = dom
    // dom.empty();
    const renderer1 = new THREE.WebGLRenderer({ antialias: true });
    renderer1.setSize(container[0].clientWidth, container[0].clientHeight);
    container[0].appendChild(renderer1.domElement);
    scene.add(ambientLight);
    scene.add(directionalLight);
    const controls1 = new THREE.OrbitControls(camera, renderer1.domElement);
    controls1.enableDamping = true;

    function animate() {
        requestAnimationFrame(animate);
        controls1.update();
        renderer1.render(scene, camera);

    }
    animate();

    return [scene, camera]
}

function createScene(dom, camera) {
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);

    const loader = new THREE.TextureLoader();
    const texture = loader.load(
        '/Public/imgs/three/bg1.jpeg',
        () => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            scene.background = texture;
        });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    const container = dom
    // dom.empty();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container[0].clientWidth, container[0].clientHeight);
    container[0].appendChild(renderer.domElement);
    scene.add(ambientLight);
    scene.add(directionalLight);
    const control = new THREE.OrbitControls(camera, renderer.domElement);
    control.enableDamping = true;

    return [scene, control, renderer]
}

async function createDEMMesh(demData, camera, m_meshname) {
    const arrayBuffer = await demData.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const width = image.getWidth();
    const height = image.getHeight();
    const elevationData = new Float32Array(rasters[0]);//DEM像素深度(32位)
    const geometry = new THREE.PlaneGeometry(5, 5 * height / width, width - 1, height - 1);
    const vertices = geometry.attributes.position.array;

    let maxElevation = -Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        if (elevationData[i] > maxElevation) {
            maxElevation = elevationData[i];
        }
    }

    let minElevation = Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        const num = elevationData[i];
        if (num !== 0 && num < minElevation) {
            minElevation = num;
        }
    }

    const n_data = elevationData.map(num => num === 0 ? minElevation - 1 : num)
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < elevationData.length; i++) {
        positions[i * 3 + 2] = (elevationData[i] - minElevation) / (maxElevation - minElevation); // 设置Z坐标
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    const colors = [];
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        if (j < elevationData.length) {
            const elevation = (n_data[j] - minElevation) / (maxElevation - minElevation);
            const color = new THREE.Color();
            color.setHSL(0.7 * (1 - elevation), 1, 0.5);
            colors.push(color.r, color.g, color.b);
        }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    var mesh_dem = new THREE.Mesh(geometry);
    mesh_dem.name = m_meshname
    mesh_dem.rotation.x = -Math.PI / 2;
    camera.position.set(0, 2, 3.5);
    return mesh_dem
}

async function createDEMMesh_AWAIT(demData, camera, m_meshname) {
    const arrayBuffer = await demData.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const width = image.getWidth();
    const height = image.getHeight();
    const elevationData = new Float32Array(rasters[0]);//DEM像素深度(32位)
    const geometry = new THREE.PlaneGeometry(5, 5 * height / width, width - 1, height - 1);
    const vertices = geometry.attributes.position.array;

    maxElevation = -Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        if (elevationData[i] > maxElevation) {
            maxElevation = elevationData[i];
        }
    }

    minElevation = Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        const num = elevationData[i];
        if (num !== 0 && num < minElevation) {
            minElevation = num;
        }
    }

    const n_data = elevationData.map(num => num === 0 ? minElevation - 1 : num)
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < elevationData.length; i++) {
        positions[i * 3 + 2] = (elevationData[i] - minElevation) / (maxElevation - minElevation); // 设置Z坐标
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    const colors = [];
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        if (j < elevationData.length) {
            const elevation = (n_data[j] - minElevation) / (maxElevation - minElevation);
            const color = new THREE.Color();
            color.setHSL(0.7 * (1 - elevation), 1, 0.5);
            colors.push(color.r, color.g, color.b);
        }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    var mesh_dem = new THREE.Mesh(geometry);
    mesh_dem.name = m_meshname
    mesh_dem.rotation.x = -Math.PI / 2;
    camera.position.set(0, 2, 3.5);
    return mesh_dem
}

function createTestGeometry() {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new THREE.Mesh(geometry, material);
    return sphere
}

async function createPointGeo(bbox_dem, pointList, clickBounds) {
    const pointGeoList = []
    const dem_width = bbox_dem.max.x - bbox_dem.min.x
    const dem_height = bbox_dem.max.z - bbox_dem.min.z
    const minX = clickBounds.getSouthWest().getLng()
    const minY = clickBounds.getSouthWest().getLat()
    const maxX = clickBounds.getNorthEast().getLng()
    const maxY = clickBounds.getNorthEast().getLat()
    const scale = Math.min(dem_width / (maxX - minX), dem_height / (maxY - minY))
    pointList.forEach(p => {
        const p_pos_tdt = new T.LngLat(p[0], p[1])
        if (clickBounds.contains(p_pos_tdt)) {
            const three_pos_x = (p[0] - minX) * dem_width / (maxX - minX)
            const three_pos_z = (p[1] - minY) * dem_height / (maxY - minY)
            const three_pos_x_trans = three_pos_x - (dem_width / 2)
            const three_pos_z_trans = (dem_height / 2) - three_pos_z
            const geometry = new THREE.SphereGeometry(scale * 0.0002, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.name = p[2]
            sphere.position.copy(new THREE.Vector3(three_pos_x_trans, 0, three_pos_z_trans))
            pointGeoList.push([sphere, p[0], p[1], p[2]])
        }
    })
    return pointGeoList
}

function updateSphereSizes(pointGeoList, camera) {
    pointGeoList.forEach(sphere => {
        const distance = sphere[0].position.distanceTo(camera.position);
        //距离过大时限制为2,距离过滤时限制为0.1
        const scale = Math.min(2, Math.max(0.1, distance / 10))
        sphere[0].scale.setScalar(scale);
    });
}

function createCompassMesh(bbox_dem, text) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FontLoader();
        loader.load('/Public/fonts/helvetiker_regular.typeface.json', function (font) {
            const textGeometry = new THREE.TextGeometry(text, {
                font: font,
                size: 0.2,
                height: 0.03,
                curveSegments: 1,
                bevelEnabled: false,
            });
            // const textMaterial = new THREE.MeshPhongMaterial({ color: 0x049ef4 });
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0x049ef4 });//不受光照影响
            const mesh_n_arrow = new THREE.Mesh(textGeometry, textMaterial);
            mesh_n_arrow.name = 'mesh_n_arrow';
            textGeometry.computeBoundingBox();

            const text_pos = new THREE.Vector3(0, bbox_dem.max.y, bbox_dem.min.z);
            mesh_n_arrow.position.copy(text_pos);

            resolve(mesh_n_arrow);
        }, undefined, reject);
    });
}

function createBridgeLabel(pointGeo) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FontLoader();
        loader.load('/Public/fonts/FangSong_GB2312_Regular.json', function (font) {
            const labelList = []
            // const textMaterial = new THREE.MeshPhongMaterial({ color: 0x049ef4 });
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0x049ef4 });//不受光照影响
            pointGeo.forEach(p => {
                const p_radius = p[0].geometry.parameters.radius
                const textGeometry = new THREE.TextGeometry(p[1], {
                    font: font,
                    size: 0.05,
                    height: 0.001,
                    curveSegments: 1,
                    bevelEnabled: false,
                });
                textGeometry.center();
                const labelMesh = new THREE.Mesh(textGeometry, textMaterial);
                labelMesh.name = p[1];
                const text_pos = new THREE.Vector3(p[0].position.x, p[0].position.y + p_radius, p[0].position.z);
                labelMesh.position.copy(text_pos);

                labelList.push(labelMesh)
            })
            resolve(labelList);
        }, undefined, reject);
    })
}

// 解析字体字符串获取字体大小
function parseFontSize(fontString) {
    // 匹配数字和单位（px, pt, em等）
    const match = fontString.match(/(\d+(?:\.\d+)?)(px|pt|em|rem)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return 12; // 默认字体大小
}

// 根据字体大小动态计算背景参数
function calculateBackgroundParams(context, text, canvasCenterX, canvasCenterY) {
    // 获取字体大小
    const fontSize = parseFontSize(context.font);

    // 测量文字尺寸
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    // 动态计算内边距（基于字体大小的比例）
    const paddingHorizontal = Math.max(2, fontSize * 0.4); // 水平内边距
    const paddingVertical = Math.max(1, fontSize * 0.3);   // 垂直内边距

    // 计算背景尺寸
    const bgWidth = textWidth + paddingHorizontal * 2;
    const bgHeight = textHeight + paddingVertical * 2;

    // 计算背景位置（居中）
    const bgX = canvasCenterX - bgWidth / 2;
    const bgY = canvasCenterY - bgHeight / 2;

    return {
        x: bgX,
        y: bgY,
        width: bgWidth,
        height: bgHeight,
        padding: {
            horizontal: paddingHorizontal,
            vertical: paddingVertical
        }
    };
}

//根据拉框大小计算字体大小
function calFontSizeByGeoBBox(bbox) {
    const minX = bbox.getSouthWest().lng
    const minY = bbox.getSouthWest().lat
    const maxX = bbox.getNorthEast().lng
    const maxY = bbox.getNorthEast().lat
    const width = maxX - minX
    const height = maxY - minY
    const geoSize = Math.max(width, height)

    let fontSize;
    if (geoSize < 0.001) { // 很小范围（约100米内）
        fontSize = 24;
    } else if (geoSize < 0.01) { // 小范围（约1公里内）
        fontSize = 12;
    } else if (geoSize < 0.1) { // 中等范围（约10公里内）
        fontSize = 6;
    } else if (geoSize < 1) { // 大范围（约100公里内）
        fontSize = 6;
    } else { // 超大范围（100公里以上）
        fontSize = 6;
    }
    fontSize = Math.max(4, Math.min(36, fontSize));

    return fontSize;
}

//canvas_精灵
function createBridgeLabelSprite(pointGeo, fontSize) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FontLoader();
        loader.load('/Public/fonts/FangSong_GB2312_Regular.json', function (font) {
            const labelList = []
            pointGeo.forEach(p => {
                const scale = fontSize <= 8 ? 8 : 4;

                // 创建高分辨率Canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true });
                const baseWidth = 256;
                const baseHeight = 256;
                canvas.width = baseWidth * scale;
                canvas.height = baseHeight * scale;
                context.scale(scale, scale);

                // 设置字体
                const fontFamily = 'Arial, sans-serif'; // 使用系统默认无衬线字体
                context.font = `bold ${fontSize}px ${fontFamily}`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';

                // 测量文字
                const metrics = context.measureText(p[1]);
                const textWidth = metrics.width;
                const textHeight = fontSize;

                // 计算背景参数（动态内边距）
                const paddingH = Math.max(2, fontSize * 0.4);
                const paddingV = Math.max(1, fontSize * 0.3);
                const bgWidth = textWidth + paddingH * 2;
                const bgHeight = textHeight + paddingV * 2;

                const centerX = baseWidth / 2;
                const centerY = baseHeight / 2;
                const bgX = centerX - bgWidth / 2;
                const bgY = centerY - bgHeight / 2;

                // 像素对齐
                const alignedBgX = Math.floor(bgX) + 0.5;
                const alignedBgY = Math.floor(bgY) + 0.5;
                const alignedBgWidth = Math.floor(bgWidth);
                const alignedBgHeight = Math.floor(bgHeight);

                // 绘制背景
                context.fillStyle = '#ffffff';
                context.fillRect(alignedBgX, alignedBgY, alignedBgWidth, alignedBgHeight);

                // 文字位置像素对齐
                const textX = Math.floor(centerX) + 0.5;
                const textY = Math.floor(centerY) + 0.5;

                // 绘制文字
                context.fillStyle = '#049ef4';
                context.fillText(p[1], textX, textY);

                // 创建 Three.js 纹理和精灵
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true
                });
                const p_radius = p[0].geometry.parameters.radius
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.name = p[1];
                sprite.scale.set(1, 1, 1);
                const text_pos = new THREE.Vector3(p[0].position.x, p[0].position.y + p_radius * 2, p[0].position.z);
                sprite.position.copy(text_pos);
                labelList.push(sprite)

            });
            resolve(labelList);

        }, undefined, reject);
    })
}

function addcompassMesh(scene, mesh_dem, tesxt) {
    const bbox_dem = new THREE.Box3().setFromObject(mesh_dem);
    const loader = new THREE.FontLoader();
    loader.load('/Public/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new THREE.TextGeometry(tesxt, {
            font: font,
            size: 0.2,
            height: 0.03,
            curveSegments: 1,
            bevelEnabled: false,
        });
        const textMaterial = new THREE.MeshPhongMaterial({ color: 0x049ef4 });
        const mesh_n_arrow = new THREE.Mesh(textGeometry, textMaterial);
        mesh_n_arrow.name = 'mesh_n_arrow'
        textGeometry.computeBoundingBox();

        const text_pos = new THREE.Vector3(0, bbox_dem.max.y, bbox_dem.min.z)

        mesh_n_arrow.position.copy(text_pos)
        scene.add(mesh_n_arrow);
    });
}

function getMeshByName(m_scene, m_name) {
    let targetMesh = null;
    m_scene.traverse(function (object) {
        if (object.isMesh && object.name === m_name) {
            targetMesh = object;
        }
    });
    return targetMesh;
}

//WMS返回只有8位数据，高程插值于255以下，放弃
function createDEMWMSUrl(layerName, toolE) {
    var minX = toolE.currentBounds.getSouthWest().lng
    var minY = toolE.currentBounds.getSouthWest().lat
    var maxX = toolE.currentBounds.getNorthEast().lng
    var maxY = toolE.currentBounds.getNorthEast().lat
    var pro_p1 = LatLon2XY(minX, minY)
    var pro_p2 = LatLon2XY(maxX, maxY)

    var _url = 'http://localhost:8080/geoserver/WMS_DEM/wms?' +
        'Request=GetMap' +
        '&Service=WMS' +
        '&Version=1.1.0' +
        '&LAYERS=' + layerName +
        '&STYLE=' +
        '&BBOX=' + minX + '%2C' + minY + '%2C' + maxX + '%2C' + maxY +
        '&WIDTH=' + Math.floor(Math.abs(pro_p2.y - pro_p1.y) / 12.5) +
        '&HEIGHT=' + Math.floor(Math.abs(pro_p2.x - pro_p1.x) / 12.5) +
        '&SRS=EPSG%3A4326' +
        '&FORMAT=image%2Fgeotiff' +
        '&TRANSPARENT=true'

    return _url
}

//WCS返回32位数据
function createDEMWCSUrl(layerName, toolE) {
    var minX = toolE.currentBounds.getSouthWest().lng
    var minY = toolE.currentBounds.getSouthWest().lat
    var maxX = toolE.currentBounds.getNorthEast().lng
    var maxY = toolE.currentBounds.getNorthEast().lat

    const wcsURL = 'http://localhost:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' + layerName +
        '&format=image/tiff' +
        '&subset=Long(' + minX + ',' + maxX + ')' +
        '&subset=Lat(' + minY + ',' + maxY + ')' +
        '&subsettingCrs=EPSG:4326';

    return wcsURL
}
//云服务器WCS服务
function createDEMWCSUrlFromALI(layerName, toolE) {
    var minX = toolE.currentBounds.getSouthWest().lng
    var minY = toolE.currentBounds.getSouthWest().lat
    var maxX = toolE.currentBounds.getNorthEast().lng
    var maxY = toolE.currentBounds.getNorthEast().lat

    const wcsURL = 'http://8.155.1.150:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' + layerName +
        '&format=image/tiff' +
        '&subset=Long(' + minX + ',' + maxX + ')' +
        '&subset=Lat(' + minY + ',' + maxY + ')' +
        '&subsettingCrs=EPSG:4326';

    return wcsURL
}

function createDEMWCSUrl_ALI(layerName, toolE) {
    var minX = toolE.currentBounds.getSouthWest().lng
    var minY = toolE.currentBounds.getSouthWest().lat
    var maxX = toolE.currentBounds.getNorthEast().lng
    var maxY = toolE.currentBounds.getNorthEast().lat

    const wcsURL = 'http://8.155.1.150:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' + layerName +
        '&format=image/tiff' +
        '&subset=Long(' + minX + ',' + maxX + ')' +
        '&subset=Lat(' + minY + ',' + maxY + ')' +
        '&subsettingCrs=EPSG:4326';

    return wcsURL
}


//'&LAYERS=WMS_DOM%3Aya_yc_e-5' +
//'&LAYERS=WMS_DOM%3Aya_e-4' +
function createDOMUrl(url, toolE) {
    var minX = toolE.currentBounds.getSouthWest().lng
    var minY = toolE.currentBounds.getSouthWest().lat
    var maxX = toolE.currentBounds.getNorthEast().lng
    var maxY = toolE.currentBounds.getNorthEast().lat
    var pro_p1 = LatLon2XY(minX, minY)
    var pro_p2 = LatLon2XY(maxX, maxY)

    var _url = url +
        'Request=GetMap' +
        '&Service=WMS' +
        '&Version=1.1.0' +
        '&LAYERS=WMS_DOM%3Aya' +
        '&STYLE=' +
        '&BBOX=' + minX + '%2C' + minY + '%2C' + maxX + '%2C' + maxY +
        '&WIDTH=' + Math.floor(Math.abs(pro_p2.y - pro_p1.y)) +
        '&HEIGHT=' + Math.floor(Math.abs(pro_p2.x - pro_p1.x)) +
        '&SRS=EPSG%3A4326' +
        '&FORMAT=image%2Fpng' +
        '&TRANSPARENT=true'
    return _url
}

async function loadDEMFromTiff(tiffFile, scene, camera, m_meshname) {
    const arrayBuffer = await tiffFile.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();

    const width = image.getWidth();
    const height = image.getHeight();

    const elevationData = new Float32Array(rasters[0]);//DEM像素深度(32位)
    const geometry = new THREE.PlaneGeometry(5, 5 * height / width, width - 1, height - 1);
    const vertices = geometry.attributes.position.array;

    let maxElevation = -Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        if (elevationData[i] > maxElevation) {
            maxElevation = elevationData[i];
        }
    }

    let minElevation = Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        const num = elevationData[i];
        if (num !== 0 && num < minElevation) {
            minElevation = num;
        }
    }

    const n_data = elevationData.map(num => num === 0 ? minElevation - 1 : num)
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < elevationData.length; i++) {
        positions[i * 3 + 2] = (elevationData[i] - minElevation) / (maxElevation - minElevation); // 设置Z坐标
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    const colors = [];
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        if (j < elevationData.length) {
            const elevation = (n_data[j] - minElevation) / (maxElevation - minElevation);
            const color = new THREE.Color();
            color.setHSL(0.7 * (1 - elevation), 1, 0.5);
            colors.push(color.r, color.g, color.b);
        }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshPhongMaterial({
        color: 0x049ef4
    })

    var mesh = new THREE.Mesh(geometry, material);
    mesh.name = m_meshname
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);

    addcompassMesh(scene, mesh, 'bbb')

    camera.position.set(0, 2, 3.5);

    return mesh
}

function deleteMesh(scene, meshName) {
    var mesh = scene.getObjectByName(meshName)
    if (mesh) {
        scene.remove(mesh)
        mesh.geometry.dispose();
        mesh.material.dispose();
    }
}

function initDrag(element) {
    let isDragging = false;
    let offsetX, offsetY;

    element.addEventListener('mousedown', (e) => {
        if (e.target === element) {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            element.style.zIndex = '100';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const playgroundRect = playground.getBoundingClientRect();
        let newX = e.clientX - playgroundRect.left - offsetX;
        let newY = e.clientY - playgroundRect.top - offsetY;

        // 边界检查
        newX = Math.max(0, Math.min(newX, playgroundRect.width - element.offsetWidth));
        newY = Math.max(0, Math.min(newY, playgroundRect.height - element.offsetHeight));

        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        element.style.zIndex = '1';
    });
}

async function loadDEMFromGeoServer(demData, scene, camera, m_meshname) {
    const arrayBuffer = await demData.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const width = image.getWidth();
    const height = image.getHeight();
    const elevationData = new Float32Array(rasters[0]);//DEM像素深度(32位)
    const geometry = new THREE.PlaneGeometry(5, 5 * height / width, width - 1, height - 1);
    const vertices = geometry.attributes.position.array;

    let maxElevation = -Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        if (elevationData[i] > maxElevation) {
            maxElevation = elevationData[i];
        }
    }

    let minElevation = Infinity;
    for (let i = 0; i < elevationData.length; i++) {
        const num = elevationData[i];
        if (num !== 0 && num < minElevation) {
            minElevation = num;
        }
    }

    const n_data = elevationData.map(num => num === 0 ? minElevation - 1 : num)
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < elevationData.length; i++) {
        positions[i * 3 + 2] = (elevationData[i] - minElevation) / (maxElevation - minElevation); // 设置Z坐标
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    const colors = [];
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        if (j < elevationData.length) {
            const elevation = (n_data[j] - minElevation) / (maxElevation - minElevation);
            const color = new THREE.Color();
            color.setHSL(0.7 * (1 - elevation), 1, 0.5);
            colors.push(color.r, color.g, color.b);
        }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    var mesh_dem = new THREE.Mesh(geometry);
    mesh_dem.name = m_meshname
    mesh_dem.rotation.x = -Math.PI / 2;
    scene.add(mesh_dem);
    const bbox_dem = new THREE.Box3().setFromObject(mesh_dem);
    // console.log(bbox_dem)
    const loader = new THREE.FontLoader();
    loader.load('/Public/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new THREE.TextGeometry('N', {
            font: font,
            size: 0.2,
            height: 0.1,
            curveSegments: 1,
            bevelEnabled: false,
        });
        const textMaterial = new THREE.MeshPhongMaterial({ color: 0x049ef4 });
        const mesh_n_arrow = new THREE.Mesh(textGeometry, textMaterial);
        mesh_n_arrow.name = 'mesh_n_arrow'
        textGeometry.computeBoundingBox();

        const text_pos = new THREE.Vector3(0, bbox_dem.max.y, bbox_dem.min.z)
        mesh_n_arrow.position.copy(text_pos)
        scene.add(mesh_n_arrow);
    });
    camera.position.set(0, 2, 3.5);

    return mesh_dem
}

async function getEleByCoord(demFile, lng, lat) {
    const arrayBuffer = await demFile.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();

    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();

    //计算左上角地理坐标
    const geoX = bbox[0]
    const geoY = bbox[3]
    //计算像元大小
    const pixelSizeX = (bbox[2] - bbox[0]) / width;
    const pixelSizeY = (bbox[3] - bbox[1]) / height;
    // 计算像素坐标
    const col = Math.floor((lng - geoX) / pixelSizeX);
    const row = Math.floor((geoY - lat) / pixelSizeY); // Y轴反向
    const cnIndex = row * width + col
    console.log(rasters[0][cnIndex])
}

async function createPointGeoWithZ(demFile, bbox_dem, pointList, clickBounds) {
    const pointGeoList = []
    //读取dem数据
    const arrayBuffer = await demFile.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    //width和height理解为x和y方向有多少个像元
    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();
    //筛选框内点
    const inBboxPointList = []
    pointList.forEach(p => {
        const p_pos_tdt = new T.LngLat(p[0], p[1])
        if (clickBounds.contains(p_pos_tdt)) {
            inBboxPointList.push([p[0], p[1], p[2]])
        }
    })

    //tdt中选择框相关参数
    const dragBoxMinX = clickBounds.getSouthWest().getLng()
    const dragBoxMinY = clickBounds.getSouthWest().getLat()
    const dragBoxMaxX = clickBounds.getNorthEast().getLng()
    const dragBoxMaxY = clickBounds.getNorthEast().getLat()

    const geo_width = dragBoxMaxX - dragBoxMinX
    const geo_height = dragBoxMaxY - dragBoxMinY

    //计算左上角地理坐标
    const geoX = bbox[0]
    const geoY = bbox[3]
    //计算像元大小
    const pixelSizeX = (bbox[2] - bbox[0]) / width; //每一个像素占多少经度
    const pixelSizeY = (bbox[3] - bbox[1]) / height;//每一个像素占多少纬度
    const dem_width = bbox_dem.max.x - bbox_dem.min.x
    const dem_height = bbox_dem.max.z - bbox_dem.min.z
    const scale = Math.min(dem_width / geo_width, dem_height / geo_height)
    inBboxPointList.forEach(p => {
        const col = Math.floor((p[0] - geoX) / pixelSizeX);//从左上角开始，第几列
        const row = Math.floor((geoY - p[1]) / pixelSizeY);//从左上角开始，第几行
        const cnIndex = row * width + col //内存位置
        const ele = rasters[0][cnIndex]
        const three_pos_y_trnas = (ele - minElevation) / (maxElevation - minElevation);//归一后的Y值
        const three_pos_x = (p[0] - dragBoxMinX) * dem_width / geo_width //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
        const three_pos_z = (p[1] - dragBoxMinY) * dem_height / geo_height//将选择框缩放至dem大小，p点位置距dem左上角y距离等比缩放
        const three_pos_x_trans = three_pos_x - (dem_width / 2) //左上坐标系平移至中间点坐标系
        const three_pos_z_trans = (dem_height / 2) - three_pos_z //左上坐标系平移至中间点坐标系
        const geometry = new THREE.SphereGeometry(scale * 0.0002, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.name = p[2]
        sphere.position.copy(new THREE.Vector3(three_pos_x_trans, three_pos_y_trnas, three_pos_z_trans))
        pointGeoList.push([sphere, p[2]])
    })

    return pointGeoList
}

async function getEleByCoordList(demFile, cnList) {
    const eleList = []
    const arrayBuffer = await demFile.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();

    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();

    //计算左上角地理坐标
    const geoX = bbox[0]
    const geoY = bbox[3]
    //计算像元大小
    const pixelSizeX = (bbox[2] - bbox[0]) / width;
    const pixelSizeY = (bbox[3] - bbox[1]) / height;
    // 计算像素坐标
    cnList.forEach(cn => {
        const col = Math.floor((cn[0] - geoX) / pixelSizeX);
        const row = Math.floor((geoY - cn[1]) / pixelSizeY); // Y轴反向
        const cnIndex = row * width + col
        const ele = rasters[0][cnIndex]
        const calEle = (ele - minElevation) / (maxElevation - minElevation);
        eleList.push(calEle)
    })
    return eleList

}

async function stitchTilesWithPosition(tiles, tileSize = 256, progressCallback) {
    if (tiles.length === 0) throw new Error('瓦片数组为空');

    const bounds = calculateBounds(tiles);
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize;
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize;

    // const canvas = document.createElement('canvas');
    const canvas = $('#canvas1')[0]
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 清空背景
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const totalTiles = tiles.length;
    let loadedCount = 0;

    // 并行加载所有图片，带进度回调
    const loadPromises = tiles.map((tile, index) =>
        loadImage(tile.url)
            .then(img => {
                loadedCount++;
                if (progressCallback) {
                    const percent = (loadedCount / totalTiles) * 100;
                    progressCallback(percent, `加载瓦片 ${loadedCount}/${totalTiles}`);
                }
                return img;
            })
            .catch(error => {
                loadedCount++;
                if (progressCallback) {
                    const percent = (loadedCount / totalTiles) * 100;
                    progressCallback(percent, `加载瓦片 ${loadedCount}/${totalTiles}`);
                }
                console.error(`加载瓦片失败: ${tile.url}`, error);
                return null;
            })
    );

    const images = await Promise.all(loadPromises);

    // 绘制所有图片
    images.forEach((img, index) => {
        if (img) {
            const tile = tiles[index];
            const x = (tile.col - bounds.minCol) * tileSize;
            const y = (tile.row - bounds.minRow) * tileSize;

            ctx.drawImage(img, x, y, tileSize, tileSize);
        } else {
            // 绘制错误占位符
            const tile = tiles[index];
            const x = (tile.col - bounds.minCol) * tileSize;
            const y = (tile.row - bounds.minRow) * tileSize;
            drawErrorTile(ctx, x, y, tileSize);
        }
    });

    return {
        canvas,
        bounds,
        tileSize
    };
}


//img_w---影像底图
function getTileWMTSUrlIMG(tileCol, tileRow, zoom) {
    const serviceNum = Math.floor(Math.random() * 8)
    const baseUrl = `https://t${serviceNum}.tianditu.gov.cn/img_w/wmts?`
    const wmtsUrl =
        baseUrl +
        'REQUEST=GetTile' +
        '&SERVICE=WMTS' +
        '&VERSION=1.0.0' +
        '&LAYER=img' +
        '&STYLE=default' +
        '&TILEMATRIXSET=w' +
        '&FORMAT=image%2Fpng' +
        '&tk=be50c7492442ecf4e61ca7bd578d6b8b' +
        '&TILECOL=' + tileCol +
        '&TILEROW=' + tileRow +
        '&TILEMATRIX=' + zoom

    return wmtsUrl
}

//cia_w---影像注记
function getTileWMTSUrlCIA(tileCol, tileRow, zoom) {
    const serviceNum = Math.floor(Math.random() * 8)
    const baseUrl = `https://t${serviceNum}.tianditu.gov.cn/cia_w/wmts?`
    const wmtsUrl =
        baseUrl +
        'REQUEST=GetTile' +
        '&SERVICE=WMTS' +
        '&VERSION=1.0.0' +
        '&LAYER=cia' +
        '&STYLE=default' +
        '&TILEMATRIXSET=w' +
        '&FORMAT=image%2Fpng' +
        '&tk=be50c7492442ecf4e61ca7bd578d6b8b' +
        '&TILECOL=' + tileCol +
        '&TILEROW=' + tileRow +
        '&TILEMATRIX=' + zoom

    return wmtsUrl

}

//vec_w---矢量底图
function getTileWMTSUrlVEC(tileCol, tileRow, zoom) {
    const serviceNum = Math.floor(Math.random() * 8)
    const baseUrl = `https://t${serviceNum}.tianditu.gov.cn/vec_w/wmts?`
    const wmtsUrl =
        baseUrl +
        'REQUEST=GetTile' +
        '&SERVICE=WMTS' +
        '&VERSION=1.0.0' +
        '&LAYER=vec' +
        '&STYLE=default' +
        '&TILEMATRIXSET=w' +
        '&FORMAT=image%2Fpng' +
        '&tk=be50c7492442ecf4e61ca7bd578d6b8b' +
        '&TILECOL=' + tileCol +
        '&TILEROW=' + tileRow +
        '&TILEMATRIX=' + zoom

    return wmtsUrl

}

//cva_w---矢量注记
function getTileWMTSUrlCVA(tileCol, tileRow, zoom) {
    const serviceNum = Math.floor(Math.random() * 8)
    const baseUrl = `https://t${serviceNum}.tianditu.gov.cn/cva_w/wmts?`
    const wmtsUrl =
        baseUrl +
        'REQUEST=GetTile' +
        '&SERVICE=WMTS' +
        '&VERSION=1.0.0' +
        '&LAYER=cva' +
        '&STYLE=default' +
        '&TILEMATRIXSET=w' +
        '&FORMAT=image%2Fpng' +
        '&tk=be50c7492442ecf4e61ca7bd578d6b8b' +
        '&TILECOL=' + tileCol +
        '&TILEROW=' + tileRow +
        '&TILEMATRIX=' + zoom

    return wmtsUrl

}


function lngLatToTile(lng, lat, zoom) {
    const x = (lng + 180) / 360;
    const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) +
        1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2;
    const tileCount = Math.pow(2, zoom);
    const tileCol = Math.floor(x * tileCount);
    const tileRow = Math.floor(y * tileCount);
    
    return [tileCol, tileRow];
}

function tileToLngLat(tileCol, tileRow, zoom) {
    const n = Math.pow(2, zoom);
    const lng = tileCol / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileRow / n)));
    const lat = latRad * 180 / Math.PI;

    return [lng, lat];
}

async function getMergePng(tdtEvent) {
    const zoom = 18;
    const tileSize = 256;

    var west = tdtEvent.currentBounds.getSouthWest().lng
    var south = tdtEvent.currentBounds.getSouthWest().lat
    var east = tdtEvent.currentBounds.getNorthEast().lng
    var north = tdtEvent.currentBounds.getNorthEast().lat

    const nw = lngLatToTile(west, north, zoom);  // 西北角
    const ne = lngLatToTile(east, north, zoom);  // 东北角
    const sw = lngLatToTile(west, south, zoom);  // 西南角
    const se = lngLatToTile(east, south, zoom);

    const minCol = Math.min(nw[0], sw[0]);
    const maxCol = Math.max(ne[0], se[0]);
    const minRow = Math.min(ne[1], se[1]);  // 注意：行号从上到下增加
    const maxRow = Math.max(nw[1], sw[1]);

    const tiles = [];
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles.push({
                url: getTileWMTSUrlIMG(col, row, zoom),
                col: col,
                row: row,
            });
        }
    }

    const bounds = calculateBounds(tiles);
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize;
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 清空背景
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 并行加载所有图片
    const loadPromises = tiles.map(tile =>
        loadImage(tile.url).catch(error => {
            console.error(`加载瓦片失败: ${tile.url}`, error);
            return null;
        })
    );

    const images = await Promise.all(loadPromises);

    // 绘制所有图片
    images.forEach((img, index) => {
        if (img) {
            const tile = tiles[index];
            const x = (tile.col - bounds.minCol) * tileSize;
            const y = (tile.row - bounds.minRow) * tileSize;

            ctx.drawImage(img, x, y, tileSize, tileSize);
        } else {
            // 绘制错误占位符
            const tile = tiles[index];
            const x = (tile.col - bounds.minCol) * tileSize;
            const y = (tile.row - bounds.minRow) * tileSize;
            drawErrorTile(ctx, x, y, tileSize);
        }
    });

    return canvas
}

async function getAllImages(tiles) {
    const loadPromises = tiles.map(tile =>
        loadImage(tile.url).catch(error => {
            console.error(`加载瓦片失败: ${tile.url}`, error);
            return null;
        })
    );
    const images = await Promise.all(loadPromises);

    return images;
}

function loadImage(url, timeout = 50000) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timer = setTimeout(() => {
            reject(new Error(`图片加载超时: ${url}`));
        }, timeout);

        img.onload = () => {
            clearTimeout(timer);
            resolve(img);
        };

        img.onerror = (error) => {
            clearTimeout(timer);
            reject(error);
        };

        img.src = url;
    });
}

function calculateBounds(tiles) {
    const cols = tiles.map(t => t.col);
    const rows = tiles.map(t => t.row);

    return {
        minCol: Math.min(...cols),
        maxCol: Math.max(...cols),
        minRow: Math.min(...rows),
        maxRow: Math.max(...rows)
    };
}

async function downloadWithFilePicker(canvas, filename = 'image.png') {
    try {
        // 转换为Blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });

        // 使用文件选择器API
        const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
                description: 'PNG Image',
                accept: { 'image/png': ['.png'] }
            }]
        });

        // 写入文件
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        console.log('文件保存成功');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('保存失败:', error);
            // 降级到传统方式
            downloadCanvasAsBlob(canvas, filename);
        }
    }
}

function getCuttedImgFromTDT(tdtEvent, canvasID) {
    const zoom = 18;
    const tileSize = 256;

    var minX = tdtEvent.currentBounds.getSouthWest().lng
    var minY = tdtEvent.currentBounds.getSouthWest().lat
    var maxX = tdtEvent.currentBounds.getNorthEast().lng
    var maxY = tdtEvent.currentBounds.getNorthEast().lat

    const nw = lngLatToTile(minX, maxY, zoom);  // 西北角
    const ne = lngLatToTile(maxX, maxY, zoom);  // 东北角
    const sw = lngLatToTile(minX, minY, zoom);  // 西南角
    const se = lngLatToTile(maxX, minY, zoom);

    const minCol = Math.min(nw[0], sw[0]);
    const maxCol = Math.max(ne[0], se[0]);
    const minRow = Math.min(ne[1], se[1]);  // 注意：行号从上到下增加
    const maxRow = Math.max(nw[1], sw[1]);

    const tiles = [];
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles.push({
                url: getTileWMTSUrlIMG(col, row, zoom),
                col: col,
                row: row,
            });
        }
    }

    const bounds = calculateBounds(tiles);
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize;
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize;

    //离屏canvas
    const canvas1 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
    canvas1.width = canvasWidth;
    canvas1.height = canvasHeight;
    ctx1.fillStyle = 'transparent';
    ctx1.fillRect(0, 0, canvasWidth, canvasHeight);

    //计算第一个瓦片左上角坐标
    const [firstTile_nw_x, firstTile_nw_y] = tileToLngLat(minCol, minRow, zoom);
    //计算最后一个瓦片右下角坐标,+1保证为右下角(否则为最后一个瓦片的左上角坐标)
    const [lastTile_se_x, lastTile_se_y] = tileToLngLat(maxCol + 1, maxRow + 1, zoom);
    //计算范围宽高
    const geoWidth = lastTile_se_x - firstTile_nw_x;
    const geoHeight = lastTile_se_y - firstTile_nw_y;
    //计算像素比例
    const pixelsPerDegreeX = canvasWidth / geoWidth;
    const pixelsPerDegreeY = canvasHeight / geoHeight;
    //计算选择框像素尺寸
    const selectionPixelWidth = (maxX - minX) * pixelsPerDegreeX;
    const selectionPixelHeight = (minY - maxY) * pixelsPerDegreeY;

    //渲染并显示canvas
    const canvas2 = $('#' + canvasID)[0];
    canvas2.width = Math.ceil(selectionPixelWidth);
    canvas2.height = Math.ceil(selectionPixelHeight);
    const ctx2 = canvas2.getContext('2d');

    // 计算偏移量
    const offset_x = (minX - firstTile_nw_x) * pixelsPerDegreeX;
    const offset_y = (maxY - firstTile_nw_y) * pixelsPerDegreeY;

    getAllImages(tiles).then(images => {
        images.forEach((img, index) => {
            const tile = tiles[index];
            const x = (tile.col - bounds.minCol) * tileSize;
            const y = (tile.row - bounds.minRow) * tileSize;
            ctx1.drawImage(img, x, y, tileSize, tileSize);
        });

        const imageData = ctx1.getImageData(
            Math.floor(offset_x),
            Math.floor(offset_y),
            canvas2.width,
            canvas2.height
        );
        ctx2.putImageData(imageData, 0, 0);
    });
}

async function initThree_TDT(scene, control, renderer, demUrl, tdtEvent, pointList, loadIndex) {
    deleteMesh(scene, 'mesh_n_arrow')
    deleteMesh(scene, 'mesh_fab')
    meshPointNameList.forEach(p => {
        deleteMesh(scene, p)
    })

    meshBridgeLabelList.forEach(p => {
        deleteMesh(scene, p)
    })
    demMeshList = []

    // 加载dem底座
    const demData = await fetch(demUrl)
    const demData2 = demData.clone()
    const mesh = await createDEMMesh_AWAIT(demData, camera, 'mesh_fab')
    demMeshList.push(mesh)
    scene.add(mesh) // scene.add 是同步的

    // 加载指北针
    const bbox_dem = new THREE.Box3().setFromObject(mesh);
    const compassMesh = await createCompassMesh(bbox_dem, 'N')
    scene.add(compassMesh) // scene.add 是同步的

    // const domTile = await getMergePng(tdtEvent)
    const domTile2 = await getMergePngCutted(tdtEvent)
    // 加载dom - 将 textureLoader.load 包装成 Promise
    await new Promise((resolve, reject) => {
        const textureLoader4 = new THREE.TextureLoader();
        textureLoader4.load(
            domTile2.toDataURL('image/png'),
            function (texture) {
                mesh.material.map = texture
                mesh.material.side = THREE.DoubleSide
                mesh.material.needsUpdate = true
                resolve(); // 加载完成
            },
            undefined,
            function (error) {
                reject(error); // 加载失败
            }
        )
    })

    //创建point
    const pointGeo = await createPointGeoWithZ(demData2, bbox_dem, pointList, tdtEvent.currentBounds)
    pointGeo.forEach(p => {
        scene.add(p[0])
        meshPointNameList.push(p[1])
    })

    //创建BridgeLabelSprite
    const fontSize = calFontSizeByGeoBBox(bbox)
    const labelList = await createBridgeLabelSprite(pointGeo, fontSize)
    labelList.forEach(l => {
        meshBridgeLabelList.push(l.name)
        scene.add(l)
    })

    //最后显示窗口
    await new Promise((resolve, reject) => {
        layer.close(loadIndex)
        $('#threeCon1').css('visibility', 'visible')
        resolve();
    })

    function animate() {
        requestAnimationFrame(animate);
        updateSphereSizes(pointGeo)

        //指北针始终面向camera
        compassMesh.lookAt(camera.position);

        control.update();
        renderer.render(scene, camera);
    }
    animate();
}

//单层Tile_裁切
async function getMergePngCutted(bbox) {
    const zoom = 18;
    const tileSize = 256;

    var minX = bbox.getSouthWest().lng
    var minY = bbox.getSouthWest().lat
    var maxX = bbox.getNorthEast().lng
    var maxY = bbox.getNorthEast().lat

    const nw = lngLatToTile(minX, maxY, zoom);  // 西北角
    const ne = lngLatToTile(maxX, maxY, zoom);  // 东北角
    const sw = lngLatToTile(minX, minY, zoom);  // 西南角
    const se = lngLatToTile(maxX, minY, zoom);

    const minCol = Math.min(nw[0], sw[0]);
    const maxCol = Math.max(ne[0], se[0]);
    const minRow = Math.min(ne[1], se[1]);  // 注意：行号从上到下增加
    const maxRow = Math.max(nw[1], sw[1]);

    const tiles = [];
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles.push({
                url: getTileWMTSUrlIMG(col, row, zoom),
                col: col,
                row: row,
            });
        }
    }

    const bounds = calculateBounds(tiles);
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize;
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize;

    //离屏canvas
    const canvas1 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
    canvas1.width = canvasWidth;
    canvas1.height = canvasHeight;
    ctx1.fillStyle = 'transparent';
    ctx1.fillRect(0, 0, canvasWidth, canvasHeight);

    //计算第一个瓦片左上角坐标
    const [firstTile_nw_x, firstTile_nw_y] = tileToLngLat(minCol, minRow, zoom);
    //计算最后一个瓦片右下角坐标,+1保证为右下角(否则为最后一个瓦片的左上角坐标)
    const [lastTile_se_x, lastTile_se_y] = tileToLngLat(maxCol + 1, maxRow + 1, zoom);
    //计算范围宽高
    const geoWidth = lastTile_se_x - firstTile_nw_x;
    const geoHeight = lastTile_se_y - firstTile_nw_y;
    //计算像素比例
    const pixelsPerDegreeX = canvasWidth / geoWidth;
    const pixelsPerDegreeY = canvasHeight / geoHeight;
    //计算选择框像素尺寸
    const selectionPixelWidth = (maxX - minX) * pixelsPerDegreeX;
    const selectionPixelHeight = (minY - maxY) * pixelsPerDegreeY;

    //渲染并显示canvas
    const canvas2 = document.createElement('canvas');
    // const canvas2 = $('#canvas1')[0]
    canvas2.width = Math.ceil(selectionPixelWidth);
    canvas2.height = Math.ceil(selectionPixelHeight);
    const ctx2 = canvas2.getContext('2d');

    // 计算偏移量
    const offset_x = (minX - firstTile_nw_x) * pixelsPerDegreeX;
    const offset_y = (maxY - firstTile_nw_y) * pixelsPerDegreeY;

    return new Promise(async (resolve, reject) => {
        try {
            const images = await getAllImages(tiles);

            // 绘制所有瓦片到canvas1
            images.forEach((img, index) => {
                const tile = tiles[index];
                const x = (tile.col - bounds.minCol) * tileSize;
                const y = (tile.row - bounds.minRow) * tileSize;
                ctx1.drawImage(img, x, y, tileSize, tileSize);
            });

            // 从canvas1裁剪到canvas2
            const imageData = ctx1.getImageData(
                Math.floor(offset_x),
                Math.floor(offset_y),
                canvas2.width,
                canvas2.height
            );
            ctx2.putImageData(imageData, 0, 0);

            resolve(canvas2);
        } catch (error) {
            reject(error);
        }
    });
}

//多层(img + cia)Tile_裁切
async function getImgCiaCutted(bbox) {
    const zoom = 18;
    const tileSize = 256;

    var minX = bbox.getSouthWest().lng
    var minY = bbox.getSouthWest().lat
    var maxX = bbox.getNorthEast().lng
    var maxY = bbox.getNorthEast().lat

    const nw = lngLatToTile(minX, maxY, zoom);  // 西北角
    const ne = lngLatToTile(maxX, maxY, zoom);  // 东北角
    const sw = lngLatToTile(minX, minY, zoom);  // 西南角
    const se = lngLatToTile(maxX, minY, zoom);

    const minCol = Math.min(nw[0], sw[0]);
    const maxCol = Math.max(ne[0], se[0]);
    const minRow = Math.min(ne[1], se[1]);  // 注意：行号从上到下增加
    const maxRow = Math.max(nw[1], sw[1]);

    const tiles = [];
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles.push({
                url: getTileWMTSUrlIMG(col, row, zoom),
                col: col,
                row: row,
            });
        }
    }

    const tiles2 = []
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles2.push({
                // url: getTileWMTSUrlCIA(col, row, zoom),
                url: getTileWMTSUrlCIA(col, row, zoom),
                col: col,
                row: row,
            });
        }
    }

    const bounds = calculateBounds(tiles);
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize;
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize;

    //离屏canvas1
    const canvas1 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
    canvas1.width = canvasWidth;
    canvas1.height = canvasHeight;
    ctx1.fillStyle = 'transparent';
    ctx1.fillRect(0, 0, canvasWidth, canvasHeight);

    //计算第一个瓦片左上角坐标
    const [firstTile_nw_x, firstTile_nw_y] = tileToLngLat(minCol, minRow, zoom);
    //计算最后一个瓦片右下角坐标,+1保证为右下角(否则为最后一个瓦片的左上角坐标)
    const [lastTile_se_x, lastTile_se_y] = tileToLngLat(maxCol + 1, maxRow + 1, zoom);
    //计算范围宽高
    const geoWidth = lastTile_se_x - firstTile_nw_x;
    const geoHeight = lastTile_se_y - firstTile_nw_y;
    //计算像素比例
    const pixelsPerDegreeX = canvasWidth / geoWidth;
    const pixelsPerDegreeY = canvasHeight / geoHeight;
    //计算选择框像素尺寸
    const selectionPixelWidth = (maxX - minX) * pixelsPerDegreeX;
    const selectionPixelHeight = (minY - maxY) * pixelsPerDegreeY;

    //离屏canvas2
    const canvas2 = document.createElement('canvas');
    canvas2.width = Math.ceil(selectionPixelWidth);
    canvas2.height = Math.ceil(selectionPixelHeight);
    const ctx2 = canvas2.getContext('2d');

    // 计算偏移量
    const offset_x = (minX - firstTile_nw_x) * pixelsPerDegreeX;
    const offset_y = (maxY - firstTile_nw_y) * pixelsPerDegreeY;

    return new Promise(async (resolve, reject) => {
        try {
            // 绘制所有img瓦片到canvas1
            const images = await getAllImages(tiles);
            images.forEach((img, index) => {
                const tile = tiles[index];
                const x = (tile.col - bounds.minCol) * tileSize;
                const y = (tile.row - bounds.minRow) * tileSize;
                ctx1.drawImage(img, x, y, tileSize, tileSize);
            });
            // 绘制所有cia瓦片到canvas1
            const cias = await getAllImages(tiles2)
            cias.forEach((cia, index) => {
                const tile = tiles2[index];
                const x = (tile.col - bounds.minCol) * tileSize;
                const y = (tile.row - bounds.minRow) * tileSize;
                ctx1.drawImage(cia, x, y, tileSize, tileSize);
            });


            // 从canvas1裁剪到canvas2
            const imageData = ctx1.getImageData(
                Math.floor(offset_x),
                Math.floor(offset_y),
                canvas2.width,
                canvas2.height
            );
            ctx2.putImageData(imageData, 0, 0);

            resolve(canvas2);
        } catch (error) {
            reject(error);
        }
    });
}

async function getImgCiaCutted2(bbox) {
    const zoom = 18;
    const tileSize = 256;

    var minX = bbox.getSouthWest().lng
    var minY = bbox.getSouthWest().lat
    var maxX = bbox.getNorthEast().lng
    var maxY = bbox.getNorthEast().lat

    const nw = lngLatToTile(minX, maxY, zoom);  // 西北角
    const ne = lngLatToTile(maxX, maxY, zoom);  // 东北角
    const sw = lngLatToTile(minX, minY, zoom);  // 西南角
    const se = lngLatToTile(maxX, minY, zoom);

    const minCol = Math.min(nw[0], sw[0]);
    const maxCol = Math.max(ne[0], se[0]);
    const minRow = Math.min(ne[1], se[1]);  // 注意：行号从上到下增加
    const maxRow = Math.max(nw[1], sw[1]);

    const tiles = [];
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles.push({
                url: getTileWMTSUrlIMG(col, row, zoom),
                col: col,
                row: row,
            });
        }
    }

    const tiles2 = []
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles2.push({
                url: getTileWMTSUrlCVA(col, row, zoom),
                col: col,
                row: row,
            });
        }
    }

    const bounds = calculateBounds(tiles);
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize;
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize;

    //离屏canvas1
    const canvas1 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
    canvas1.width = canvasWidth;
    canvas1.height = canvasHeight;
    ctx1.fillStyle = 'transparent';
    ctx1.fillRect(0, 0, canvasWidth, canvasHeight);

    //计算第一个瓦片左上角坐标
    const [firstTile_nw_x, firstTile_nw_y] = tileToLngLat(minCol, minRow, zoom);
    //计算最后一个瓦片右下角坐标,+1保证为右下角(否则为最后一个瓦片的左上角坐标)
    const [lastTile_se_x, lastTile_se_y] = tileToLngLat(maxCol + 1, maxRow + 1, zoom);
    //计算范围宽高
    const geoWidth = lastTile_se_x - firstTile_nw_x;
    const geoHeight = lastTile_se_y - firstTile_nw_y;
    //计算像素比例
    const pixelsPerDegreeX = canvasWidth / geoWidth;
    const pixelsPerDegreeY = canvasHeight / geoHeight;
    //计算选择框像素尺寸
    const selectionPixelWidth = (maxX - minX) * pixelsPerDegreeX;
    const selectionPixelHeight = (minY - maxY) * pixelsPerDegreeY;

    //离屏canvas2
    const canvas2 = document.createElement('canvas');
    canvas2.width = Math.ceil(selectionPixelWidth);
    canvas2.height = Math.ceil(selectionPixelHeight);
    const ctx2 = canvas2.getContext('2d');

    // 计算偏移量
    const offset_x = (minX - firstTile_nw_x) * pixelsPerDegreeX;
    const offset_y = (maxY - firstTile_nw_y) * pixelsPerDegreeY;

    return new Promise(async (resolve, reject) => {
        try {
            // 绘制所有img瓦片到canvas1
            const images = await getAllImages(tiles);
            images.forEach((img, index) => {
                const tile = tiles[index];
                const x = (tile.col - bounds.minCol) * tileSize;
                const y = (tile.row - bounds.minRow) * tileSize;
                ctx1.drawImage(img, x, y, tileSize, tileSize);
            });
            // 绘制所有cia瓦片到canvas1
            const cias = await getAllImages(tiles2)
            cias.forEach((cia, index) => {
                const tile = tiles2[index];
                const x = (tile.col - bounds.minCol) * tileSize;
                const y = (tile.row - bounds.minRow) * tileSize;
                ctx1.drawImage(cia, x, y, tileSize, tileSize);
            });


            // 从canvas1裁剪到canvas2
            const imageData = ctx1.getImageData(
                Math.floor(offset_x),
                Math.floor(offset_y),
                canvas2.width,
                canvas2.height
            );
            ctx2.putImageData(imageData, 0, 0);

            resolve(canvas2);
        } catch (error) {
            reject(error);
        }
    });
}



function getBbox() {
    return new Promise((resolve, reject) => {
        const handler = (e) => {
            const bbox = e.currentBounds;
            geo_bbox = bbox;
            recTool.removeEventListener('draw', handler);
            resolve(bbox);
        };
        recTool.addEventListener('draw', handler);
    });
}

//WCS返回32位数据
async function seturl_dem(layerName, bbox) {
    var minX = bbox.getSouthWest().lng
    var minY = bbox.getSouthWest().lat
    var maxX = bbox.getNorthEast().lng
    var maxY = bbox.getNorthEast().lat

    const wcsURL = 'http://localhost:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' + layerName +
        '&format=image/tiff' +
        '&subset=Long(' + minX + ',' + maxX + ')' +
        '&subset=Lat(' + minY + ',' + maxY + ')' +
        '&subsettingCrs=EPSG:4326';

    return wcsURL
}

//初始化3D窗口
async function initThreeView(scene, control, renderer, bbox, camera, pointList, loadIndex,domID) {
    deleteMesh(scene, 'mesh_n_arrow')
    deleteMesh(scene, 'mesh_fab')
    meshPointNameList.forEach(p => {
        deleteMesh(scene, p)
    })

    meshBridgeLabelList.forEach(p => {
        deleteMesh(scene, p)
    })
    demMeshList = []

    // 加载dem底座
    const FABDEM_WCS_UR = await seturl_dem('WCS_DEM:DEM_SC_FABDEM', bbox)
    const demData = await fetch(FABDEM_WCS_UR)
    const demData2 = demData.clone()
    const mesh = await createDEMMesh_AWAIT(demData, camera, 'mesh_fab')
    demMeshList.push(mesh)
    scene.add(mesh) // scene.add 是同步的

    // 加载指北针
    const bbox_dem = new THREE.Box3().setFromObject(mesh);
    const compassMesh = await createCompassMesh(bbox_dem, 'N')
    scene.add(compassMesh) // scene.add 是同步的

    const domTile = await getImgCiaCutted(bbox)
    const texture = new THREE.CanvasTexture(domTile);
    //   texture.minFilter = THREE.LinearFilter;
    // texture.magFilter = THREE.LinearFilter;

    // 4. 将纹理应用到材质
    mesh.material.map = texture;
    mesh.material.side = THREE.DoubleSide;
    mesh.material.needsUpdate = true;
    // await new Promise((resolve, reject) => {
    //     const textureLoader4 = new THREE.TextureLoader();
    //     textureLoader4.load(
    //         domTile.toDataURL('image/png'),
    //         function (texture) {
    //             mesh.material.map = texture
    //             mesh.material.side = THREE.DoubleSide
    //             mesh.material.needsUpdate = true
    //             resolve(); // 加载完成
    //         },
    //         undefined,
    //         function (error) {
    //             reject(error); // 加载失败
    //         }
    //     )
    // })

    //创建point
    const pointGeo = await createPointGeoWithZ(demData2, bbox_dem, pointList, bbox)
    pointGeo.forEach(p => {
        scene.add(p[0])
        meshPointNameList.push(p[1])
    })

    //创建BridgeLabelSprite
    const fontSize = calFontSizeByGeoBBox(bbox)
    const labelList = await createBridgeLabelSprite(pointGeo, fontSize)
    labelList.forEach(l => {
        meshBridgeLabelList.push(l.name)
        scene.add(l)
    })

    //最后显示窗口
    await new Promise((resolve, reject) => {
        layer.close(loadIndex)

        $('#' + domID).css('visibility', 'visible')
        resolve();
    })

    function animate() {
        requestAnimationFrame(animate);
        updateSphereSizes(pointGeo, camera)

        //指北针始终面向camera
        compassMesh.lookAt(camera.position);

        control.update();
        renderer.render(scene, camera);
    }
    animate();
}

async function initThreeView2(scene, control, renderer, bbox, camera, pointList, loadIndex,domID) {
    deleteMesh(scene, 'mesh_n_arrow')
    deleteMesh(scene, 'mesh_fab')
    meshPointNameList.forEach(p => {
        deleteMesh(scene, p)
    })

    meshBridgeLabelList.forEach(p => {
        deleteMesh(scene, p)
    })
    demMeshList = []

    // 加载dem底座
    const FABDEM_WCS_UR = await seturl_dem('WCS_DEM:DEM_SC_FABDEM', bbox)
    const demData = await fetch(FABDEM_WCS_UR)
    const demData2 = demData.clone()
    const mesh = await createDEMMesh_AWAIT(demData, camera, 'mesh_fab')
    demMeshList.push(mesh)
    scene.add(mesh) // scene.add 是同步的

    // 加载指北针
    const bbox_dem = new THREE.Box3().setFromObject(mesh);
    const compassMesh = await createCompassMesh(bbox_dem, 'N')
    scene.add(compassMesh) // scene.add 是同步的

    const domTile = await getImgCiaCutted2(bbox)
    await new Promise((resolve, reject) => {
        const textureLoader4 = new THREE.TextureLoader();
        textureLoader4.load(
            domTile.toDataURL('image/png'),
            function (texture) {
                mesh.material.map = texture
                mesh.material.side = THREE.DoubleSide
                mesh.material.needsUpdate = true
                resolve(); // 加载完成
            },
            undefined,
            function (error) {
                reject(error); // 加载失败
            }
        )
    })

    //创建point
    const pointGeo = await createPointGeoWithZ(demData2, bbox_dem, pointList, bbox)
    pointGeo.forEach(p => {
        scene.add(p[0])
        meshPointNameList.push(p[1])
    })

    //创建BridgeLabelSprite
    const fontSize = calFontSizeByGeoBBox(bbox)
    const labelList = await createBridgeLabelSprite(pointGeo, fontSize)
    labelList.forEach(l => {
        meshBridgeLabelList.push(l.name)
        scene.add(l)
    })

    //最后显示窗口
    await new Promise((resolve, reject) => {
        layer.close(loadIndex)

        $('#' + domID).css('visibility', 'visible')
        resolve();
    })

    function animate() {
        requestAnimationFrame(animate);
        updateSphereSizes(pointGeo, camera)

        //指北针始终面向camera
        compassMesh.lookAt(camera.position);

        control.update();
        renderer.render(scene, camera);
    }
    animate();
}


//注册3D窗口点击事件--单点
async function init3DViewCLick(scene, render, camera, mesh) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let dem_marker;
    let geo_marker;

    $('#threeCon1').on('mouseenter', function () {
        $(this).off('dblclick')
        $(this).on('dblclick', (event) => {
            ThreeDomClickHD(event, render, camera, mesh)
        })
    })

    $('#threeCon1').on('mouseleave', function () {
        $(this).off('dblclick')
        $(this).off('dblclick', (event) => {
            ThreeDomClickHD(event, render, camera, mesh)
        })
    })

    //3D窗口点击事件
    function ThreeDomClickHD(event, render, camera, mesh) {
        const canvas = render.domElement
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        mouse.x = (x / canvas.clientWidth) * 2 - 1;
        mouse.y = - (y / canvas.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(mesh);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            if (!dem_marker) {
                const markerGeometry = new THREE.SphereGeometry(0.01, 16, 16);
                const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                dem_marker = new THREE.Mesh(markerGeometry, markerMaterial);
                dem_marker.name = 'dem_marker'
                dem_marker.position.copy(point);
                scene.add(dem_marker);
                dem_marker_list.push(dem_marker)
            } else {
                dem_marker.position.copy(point)
            }

            //计算dem_mesh宽高
            const bbox = new THREE.Box3().setFromObject(mesh[0]);
            const dem_width = bbox.max.x - bbox.min.x
            const dem_height = bbox.max.z - bbox.min.z

            //计算geo宽高
            const minX = geo_bbox.getSouthWest().lng
            const minY = geo_bbox.getSouthWest().lat
            const maxX = geo_bbox.getNorthEast().lng
            const maxY = geo_bbox.getNorthEast().lat
            const geo_width = maxX - minX;
            const geo_height = maxY - minY;

            //canvas点_中心坐标系
            var canvas_x = intersects[0].point.x
            var canvas_z = intersects[0].point.z
            //canvas点_左上坐标系
            const p_x = canvas_x + (dem_width / 2)
            const p_y = (dem_height / 2) - canvas_z

            //geo点
            const p_x_geo = minX + (p_x * geo_width) / dem_width
            const p_y_geo = minY + (p_y * geo_height) / dem_height

            if (!geo_marker) {
                geo_marker = new T.Circle(
                    new T.LngLat(p_x_geo, p_y_geo),
                    2,
                    {
                        color: "blue",
                        weight: 5,
                        opacity: 0.5,
                        fillColor: "#FFFFFF",
                        fillOpacity: 0.5,
                        lineStyle: "solid",
                        name: "geo_marker"
                    }
                );
                map.addOverLay(geo_marker)
                geo_marker_list.push(geo_marker)
            } else {
                geo_marker.setCenter(new T.LngLat(p_x_geo, p_y_geo))
            }

        }
    }
}

//注册3D窗口点击事件--多点
async function init3DViewCLickS(render, camera, mesh, geomarkers, demmarkers) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    $('#threeCon1').on('mouseenter', function () {
        $(this).off('dblclick')
        $(this).on('dblclick', (event) => {
            ThreeDomClickHD(event, render, camera, mesh)
        })
    })

    $('#threeCon1').on('mouseleave', function () {
        $(this).off('dblclick')
        $(this).off('dblclick', (event) => {
            ThreeDomClickHD(event, render, camera, mesh)
        })
    })

    //3D窗口点击事件
    function ThreeDomClickHD(event, render, camera, mesh) {
        console.log('a')
        const canvas = render.domElement
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        mouse.x = (x / canvas.clientWidth) * 2 - 1;
        mouse.y = - (y / canvas.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(mesh);
        if (intersects.length > 0) {
            const point = intersects[0].point;

            const markerGeometry = new THREE.SphereGeometry(0.01, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const dem_marker = new THREE.Mesh(markerGeometry, markerMaterial);
            dem_marker.position.copy(point);
            scene1.add(dem_marker);
            demmarkers.push(dem_marker)

            //计算dem_mesh宽高
            const bbox = new THREE.Box3().setFromObject(mesh[0]);
            const dem_width = bbox.max.x - bbox.min.x
            const dem_height = bbox.max.z - bbox.min.z

            //计算geo宽高
            const minX = geo_bbox.getSouthWest().lng
            const minY = geo_bbox.getSouthWest().lat
            const maxX = geo_bbox.getNorthEast().lng
            const maxY = geo_bbox.getNorthEast().lat
            const geo_width = maxX - minX;
            const geo_height = maxY - minY;

            //canvas点_中心坐标系
            var canvas_x = intersects[0].point.x
            var canvas_z = intersects[0].point.z
            //canvas点_左上坐标系
            const p_x = canvas_x + (dem_width / 2)
            const p_y = (dem_height / 2) - canvas_z

            //geo点
            const p_x_geo = minX + (p_x * geo_width) / dem_width
            const p_y_geo = minY + (p_y * geo_height) / dem_height

            const geo_marker = new T.Circle(
                new T.LngLat(p_x_geo, p_y_geo),
                5,
                {
                    color: "blue",
                    weight: 5,
                    opacity: 0.5,
                    fillColor: "#FFFFFF",
                    fillOpacity: 0.5,
                    lineStyle: "solid"
                }
            );
            map.addOverLay(geo_marker)
            geomarkers.push(geo_marker)

        }
    }
}

function clearMarkers(map, geomarkers, scene, demmarkers) {

    geomarkers.forEach(gm => {
        map.removeOverLay(gm)
    })

    demmarkers.forEach(dm => {
        scene.remove(dm)
    })
}

