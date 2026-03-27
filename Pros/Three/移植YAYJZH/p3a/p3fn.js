function clearOverLays() {
    demOverLayerList.forEach(ov => {
        map.removeOverLay(ov)
    })
    demOverLayerList = []

    // geo_marker_list.forEach(gm => {
    //     map.removeOverLay(gm)
    // })
    // geo_marker_list = []
}

//根据坐标计算行列号
function lngLatToTile(lng, lat, zoom) {
    const x = (lng + 180) / 360
    const y =
        (1 -
            Math.log(
                Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
            ) /
            Math.PI) /
        2
    const tileCount = Math.pow(2, zoom)
    const tileCol = Math.floor(x * tileCount)
    const tileRow = Math.floor(y * tileCount)

    return [tileCol, tileRow]
}

//从天地图获取WMTS切片(img)
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
        '&TILECOL=' +
        tileCol +
        '&TILEROW=' +
        tileRow +
        '&TILEMATRIX=' +
        zoom

    return wmtsUrl
}

//从天地图获取WMTS切片(cia)
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
        '&TILECOL=' +
        tileCol +
        '&TILEROW=' +
        tileRow +
        '&TILEMATRIX=' +
        zoom

    return wmtsUrl
}

//计算瓦片行列号边界
function calculateBounds(tiles) {
    const cols = tiles.map(t => t.col)
    const rows = tiles.map(t => t.row)

    return {
        minCol: Math.min(...cols),
        maxCol: Math.max(...cols),
        minRow: Math.min(...rows),
        maxRow: Math.max(...rows)
    }
}

//根据行列号计算坐标
function tileToLngLat(tileCol, tileRow, zoom) {
    const n = Math.pow(2, zoom)
    const lng = (tileCol / n) * 360 - 180
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileRow) / n)))
    const lat = (latRad * 180) / Math.PI

    return [lng, lat]
}

//根据bounds生成四条线
function c_bbox_line(bbox) {
    const NE = bbox.getNorthEast()
    const SW = bbox.getSouthWest()
    const minX = SW.lng
    const minY = SW.lat
    const maxX = NE.lng
    const maxY = NE.lat
    const edge_left = [
        [minX, minY],
        [minX, maxY]
    ]
    const edge_top = [
        [minX, maxY],
        [maxX, maxY]
    ]
    const edge_right = [
        [maxX, maxY],
        [maxX, minY]
    ]
    const edge_bottom = [
        [maxX, minY],
        [minX, minY]
    ]

    return [edge_left, edge_top, edge_right, edge_bottom]
}

//求两线平面交点
function lineSegmentsIntersect(seg1, seg2, epsilon = 1e-10) {
    const [p1, p2] = seg1;
    const [p3, p4] = seg2;

    // 计算方向向量
    const d1x = p2[0] - p1[0];
    const d1y = p2[1] - p1[1];
    const d2x = p4[0] - p3[0];
    const d2y = p4[1] - p3[1];

    // 计算分母
    const denominator = d1x * d2y - d1y * d2x;

    // 线段平行或共线
    if (Math.abs(denominator) < epsilon) {
        return { intersects: false };
    }

    // 计算参数 t 和 u
    const t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / denominator;
    const u = ((p3[0] - p1[0]) * d1y - (p3[1] - p1[1]) * d1x) / denominator;

    // 严格检查交点是否在线段内部（排除端点）
    const isTInside = t > epsilon && t < 1 - epsilon;
    const isUInside = u > epsilon && u < 1 - epsilon;

    if (isTInside && isUInside) {
        // 计算交点坐标
        const intersectionX = p1[0] + t * d1x;
        const intersectionY = p1[1] + t * d1y;

        return {
            intersects: true,
            intersectionPoint: [intersectionX, intersectionY],
            t: t,
            u: u
        };
    }

    return { intersects: false };
}

//工具函数-----------------


//设置数据Bbox(line)
async function setSourceBounds(url, layerName) {
    const response = await fetch(url)
    const xmlText = await response.text()
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    // 解析所有图层
    let layerInfo
    const layerElements = xmlDoc.getElementsByTagName('Layer')
    for (let layerElem of layerElements) {
        const name = layerElem.getElementsByTagName('Name')[0]?.textContent

        if (name == layerName) {
            // 解析边界框
            const bbox = layerElem.getElementsByTagName('BoundingBox')[0]
            const boundingBox = bbox
                ? {
                    crs: bbox.getAttribute('CRS'),
                    minx: parseFloat(bbox.getAttribute('minx')),
                    miny: parseFloat(bbox.getAttribute('miny')),
                    maxx: parseFloat(bbox.getAttribute('maxx')),
                    maxy: parseFloat(bbox.getAttribute('maxy'))
                }
                : null

            layerInfo = { layer_name: name, layer_boundingBox: boundingBox }
        }
    }
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
    })
    map.addOverLay(line)
}

//创建全局scene和camera
function createScene(domID, camera) {
    const ambientLight = new THREE.AmbientLight(0x404040)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)

    const loader = new THREE.TextureLoader()
    const texture = loader.load('/Public/imgs/three/bg1.jpeg', () => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        texture.colorSpace = THREE.SRGBColorSpace
        scene.background = texture
    })

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    const container = domID
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
    })
    renderer.setSize(container[0].clientWidth, container[0].clientHeight)
    container[0].appendChild(renderer.domElement)
    scene.add(ambientLight)
    scene.add(directionalLight)
    const control = new THREE.OrbitControls(camera, renderer.domElement)
    control.enablePan = true
    control.panSpeed = 1.0 // 调整平移速度
    control.keyPanSpeed = 20.0

    return [scene, control, renderer]
}

//recTool.draw->bbox
function getBbox() {
    return new Promise((resolve, reject) => {
        const handler = e => {
            const bbox = e.currentBounds
            recTool.removeEventListener('draw', handler)
            resolve(bbox)
        }
        recTool.addEventListener('draw', handler)
    })
}

//本地dem地址--边界扩展
async function setDEMUrl(layerName, bbox) {
    const resolution = 0.00027777778
    const minX = bbox.getSouthWest().lng
    const minY = bbox.getSouthWest().lat
    const maxX = bbox.getNorthEast().lng
    const maxY = bbox.getNorthEast().lat

    let wcsURL =
        'http://8.155.1.150:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' +
        layerName +
        '&format=image/tiff' +
        '&subset=Long(' +
        minX +
        ',' +
        maxX +
        ')' +
        '&subset=Lat(' +
        minY +
        ',' +
        maxY +
        ')'

    const demData = await fetch(wcsURL)
    const arrayBuffer = await demData.arrayBuffer()
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer)
    const image = await tiff.getImage()
    const dem_range = image.getBoundingBox()

    let [dem_minX, dem_minY, dem_maxX, dem_maxY] = dem_range
    //如果minX小于dem_minX,划取的边界点在DEM的范围外，则将dem_minX向左偏移一个像元宽度以包裹住minX
    if (minX < dem_minX) {
        dem_minX = dem_minX - resolution
    }
    if (minY < dem_minY) {
        dem_minY = dem_minY - resolution
    }
    //如果maxX大于dem_maxX,划取的边界点在DEM的范围外，则将dem_maxX向右偏移一个像元宽度以包裹住maxX
    if (maxX > dem_maxX) {
        dem_maxX = dem_maxX + resolution
    }
    if (maxY > dem_maxY) {
        dem_maxY = dem_maxY + resolution
    }

    wcsURL =
        'http://8.155.1.150:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' +
        layerName +
        '&format=image/tiff' +
        '&subset=Long(' +
        dem_minX +
        ',' +
        dem_maxX +
        ')' +
        '&subset=Lat(' +
        dem_minY +
        ',' +
        dem_maxY +
        ')'

    return [wcsURL, [dem_minX, dem_minY, dem_maxX, dem_maxY]]
}

//生成mesh_dem
async function c_mesh_dem(demData, camera, m_meshname) {
    //GeoTIFF.js库读取信息
    const tiff = await GeoTIFF.fromArrayBuffer(demData)
    const image = await tiff.getImage()
    const rasters = await image.readRasters()
    //dem的x、y方向的像元数(tile数量)
    const width = image.getWidth()
    const height = image.getHeight()
    //DEM像素深度(32位)
    const elevationData = new Float32Array(rasters[0])
    //保持长宽比，plane的width按比例拉伸
    const geometry = new THREE.PlaneGeometry(5, 5 * height / width, width - 1, height - 1)
    //最大高程值
    let maxElevation = -Infinity
    for (let i = 0; i < elevationData.length; i++) {
        if (elevationData[i] > maxElevation) {
            maxElevation = elevationData[i]
        }
    }
    //最小高程值
    let minElevation = Infinity
    for (let i = 0; i < elevationData.length; i++) {
        const num = elevationData[i]
        if (num !== 0 && num < minElevation) {
            minElevation = num
        }
    }
    //生成的plane的顶点信息
    const positions = geometry.attributes.position.array
    for (let i = 0; i < elevationData.length; i++) {
        //dem只有一个高程值时
        if (maxElevation == minElevation) {
            positions[i * 3 + 2] = 0
        }
        //*****每一组顶点数据的最后一个是z值，将其设置为归一后的高程值
        else {
            //生成mesh的时候用右手坐标系，所以x,y都已经有值了，只能用z值来代表高度
            positions[i * 3 + 2] = (elevationData[i] - minElevation) / (maxElevation - minElevation) // 设置Z坐标
        }
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()

    var mesh_dem = new THREE.Mesh(geometry)
    mesh_dem.name = m_meshname
    //mesh是右手坐标系，z值朝屏幕外，所以绕x轴向上旋转
    mesh_dem.rotation.x = -Math.PI / 2
    camera.position.set(0, 5, 3.5)
    return [mesh_dem, minElevation, maxElevation, geometry]
}

//多层(img + cia)Tile_裁切_可选level
async function c_dom_img_cia_lv(bbox, lv) {
    const zoom = lv
    const tileSize = 256

    var minX = bbox.getSouthWest().lng
    var minY = bbox.getSouthWest().lat
    var maxX = bbox.getNorthEast().lng
    var maxY = bbox.getNorthEast().lat

    const nw = lngLatToTile(minX, maxY, zoom) // 西北角
    const ne = lngLatToTile(maxX, maxY, zoom) // 东北角
    const sw = lngLatToTile(minX, minY, zoom) // 西南角
    const se = lngLatToTile(maxX, minY, zoom)

    const minCol = Math.min(nw[0], sw[0])
    const maxCol = Math.max(ne[0], se[0])
    const minRow = Math.min(ne[1], se[1]) // 注意：行号从上到下增加
    const maxRow = Math.max(nw[1], sw[1])

    const tiles = []
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles.push({
                url: getTileWMTSUrlIMG(col, row, zoom),
                col: col,
                row: row
            })
        }
    }

    const tiles2 = []
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            tiles2.push({
                url: getTileWMTSUrlCIA(col, row, zoom),
                col: col,
                row: row
            })
        }
    }

    const bounds = calculateBounds(tiles)
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize

    //离屏canvas1
    const canvas1 = document.createElement('canvas')
    const ctx1 = canvas1.getContext('2d', { willReadFrequently: true })
    canvas1.width = canvasWidth
    canvas1.height = canvasHeight
    ctx1.fillStyle = 'transparent'
    ctx1.fillRect(0, 0, canvasWidth, canvasHeight)

    //计算第一个瓦片左上角坐标
    const [firstTile_nw_x, firstTile_nw_y] = tileToLngLat(minCol, minRow, zoom)
    //计算最后一个瓦片右下角坐标,+1保证为右下角(否则为最后一个瓦片的左上角坐标)
    const [lastTile_se_x, lastTile_se_y] = tileToLngLat(
        maxCol + 1,
        maxRow + 1,
        zoom
    )
    //计算范围宽高
    const geo_width = lastTile_se_x - firstTile_nw_x
    const geo_height = lastTile_se_y - firstTile_nw_y
    //计算像素比例
    const pixelsPerDegreeX = canvasWidth / geo_width
    const pixelsPerDegreeY = canvasHeight / geo_height
    //计算选择框像素尺寸
    const selectionPixelWidth = (maxX - minX) * pixelsPerDegreeX
    const selectionPixelHeight = (minY - maxY) * pixelsPerDegreeY

    //离屏canvas2
    const canvas2 = document.createElement('canvas')
    canvas2.width = Math.ceil(selectionPixelWidth)
    canvas2.height = Math.ceil(selectionPixelHeight)
    const ctx2 = canvas2.getContext('2d')

    // 计算偏移量
    const offset_x = (minX - firstTile_nw_x) * pixelsPerDegreeX
    const offset_y = (maxY - firstTile_nw_y) * pixelsPerDegreeY

    return new Promise(async (resolve, reject) => {
        try {
            // 绘制所有img瓦片到canvas1
            const images = await getAllImages(tiles)
            images.forEach((img, index) => {
                const tile = tiles[index]
                const x = (tile.col - bounds.minCol) * tileSize
                const y = (tile.row - bounds.minRow) * tileSize
                ctx1.drawImage(img, x, y, tileSize, tileSize)
            })
            // 绘制所有cia瓦片到canvas1
            const cias = await getAllImages(tiles2)
            cias.forEach((cia, index) => {
                const tile = tiles2[index]
                const x = (tile.col - bounds.minCol) * tileSize
                const y = (tile.row - bounds.minRow) * tileSize
                ctx1.drawImage(cia, x, y, tileSize, tileSize)
            })

            // 从canvas1裁剪到canvas2
            const imageData = ctx1.getImageData(
                Math.floor(offset_x),
                Math.floor(offset_y),
                canvas2.width,
                canvas2.height
            )
            ctx2.putImageData(imageData, 0, 0)

            resolve(canvas2)
        } catch (error) {
            reject(error)
        }
    })
}

//new Image().onLoad-批量
async function getAllImages(tiles) {
    const loadPromises = tiles.map(tile =>
        loadImage(tile.url).catch(error => {
            console.error(`加载瓦片失败: ${tile.url}`, error)
            return null
        })
    )
    const images = await Promise.all(loadPromises)

    return images
}

//new Image().onload-获取地址的数据----fetch(url)
function loadImage(url, timeout = 5000000) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        const timer = setTimeout(() => {
            reject(new Error(`图片加载超时: ${url}`))
        }, timeout)

        img.onload = () => {
            clearTimeout(timer)
            resolve(img)
        }

        img.onerror = error => {
            clearTimeout(timer)
            reject(error)
        }

        img.src = url
    })
}

//重置group
function deleteGroup(scene, groupName) {
    const group = scene.getObjectByName(groupName);
    if (group) {
        scene.remove(group)
    }
}

function setupInteractionContext(
    renderer, camera, terrainMesh,
    waterUniforms, simHeightData, colCounts, rowCounts,
    rtWater, rtFlux, rtPollution
) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isInjecting = false;
    let injectUV = new THREE.Vector2();

    function calculateSlopeDirection(u, v) {
        const texelX = 1 / colCounts;
        const texelY = 1 / rowCounts;

        const ix = Math.floor(u * colCounts);
        const iy = Math.floor(v * rowCounts);

        const getHeight = (x, y) => {
            x = Math.max(0, Math.min(colCounts - 1, x));
            y = Math.max(0, Math.min(rowCounts - 1, y));
            return simHeightData[(y * colCounts + x) * 4];
        };

        const hC = getHeight(ix, iy);
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

    function getMouseNDC(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        return {
            x: ((event.clientX - rect.left) / w) * 2 - 1,
            y: -((event.clientY - rect.top) / h) * 2 + 1
        };
    }

    function onMouseDown(event) {
        const ndc = getMouseNDC(event);
        mouse.x = ndc.x;
        mouse.y = ndc.y;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(terrainMesh);

        if (intersects.length > 0) {
            resetSimulation(renderer, rtWater, rtFlux, rtPollution);
            const uv = intersects[0].uv;
            injectUV.set(uv.x, 1.0 - uv.y);
            const slopeDir = calculateSlopeDirection(uv.x, 1.0 - uv.y);
            waterUniforms.uSlopeDir.value.copy(slopeDir);
            isInjecting = true;
            waterUniforms.uInjectActive.value = true;
            waterUniforms.uInjectPos.value.copy(injectUV);
        }
    }

    function onMouseUp() {
        isInjecting = false;
        waterUniforms.uInjectActive.value = false;
    }

    function onMouseMove(event) {
        if (!isInjecting) return;
        const ndc = getMouseNDC(event);
        mouse.x = ndc.x;
        mouse.y = ndc.y;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(terrainMesh);

        if (intersects.length > 0) {
            const uv = intersects[0].uv;
            injectUV.set(uv.x, 1.0 - uv.y);
            waterUniforms.uInjectPos.value.copy(injectUV);
            const slopeDir = calculateSlopeDirection(uv.x, 1.0 - uv.y);
            waterUniforms.uSlopeDir.value.copy(slopeDir);
        }
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
}

function resetSimulation(renderer, rtWater, rtFlux, rtPollution) {
    const clearColor = new THREE.Color(0, 0, 0);
    renderer.setClearColor(clearColor, 0);
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

function simulationStep(
    renderer,
    gpgpuScene, gpgpuCamera,
    fluxMesh, waterMesh, pollutionMesh,
    fluxUniforms, waterUniforms, pollutionUniforms,
    rtWater, rtFlux, rtPollution,
    currentBuffer,
    waterRenderMat, terrainMat
) {
    const curr = currentBuffer;
    const next = 1 - curr;

    // 清空场景
    gpgpuScene.clear();

    // 步骤1: 计算通量
    gpgpuScene.add(fluxMesh);

    fluxUniforms.uWaterTex.value = rtWater[curr].texture;
    fluxUniforms.uFluxTex.value = rtFlux[curr].texture;

    renderer.setRenderTarget(rtFlux[next]);
    renderer.render(gpgpuScene, gpgpuCamera);

    // 步骤2: 更新水深
    gpgpuScene.clear();
    gpgpuScene.add(waterMesh);

    waterUniforms.uWaterTex.value = rtWater[curr].texture;
    waterUniforms.uFluxTex.value = rtFlux[next].texture;

    renderer.setRenderTarget(rtWater[next]);
    renderer.render(gpgpuScene, gpgpuCamera);

    // 步骤3: 更新污染标记
    gpgpuScene.clear();
    gpgpuScene.add(pollutionMesh);

    pollutionUniforms.uPollutionTex.value = rtPollution[curr].texture;
    pollutionUniforms.uWaterTex.value = rtWater[next].texture;

    renderer.setRenderTarget(rtPollution[next]);
    renderer.render(gpgpuScene, gpgpuCamera);

    // 步骤4: 更新渲染材质，返回新 buffer 索引
    waterRenderMat.uniforms.uWaterTex.value = rtWater[next].texture;
    terrainMat.uniforms.uPollutionTex.value = rtPollution[next].texture;
    terrainMat.uniforms.uWaterTex.value = rtWater[next].texture;

    return next;
}

