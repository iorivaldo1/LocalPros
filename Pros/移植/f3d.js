//工具函数-----------------
//清除tdt各种marker
function clearOverLays() {
    if (typeof demOverLayerList !== 'undefined') {
        demOverLayerList.forEach(ov => {
            map.removeOverLay(ov)
        })
    }
    if (typeof geo_marker_list !== 'undefined') {
        geo_marker_list.forEach(gm => {
            map.removeOverLay(gm)
        })
    }
}

//TDT中显示坐标
function regShowCoord(map) {
    var flag = 0
    let bt = $('.switch')[0]
    let circle = $('.switch_circle')[0]
    bt.addEventListener('click', () => {
        bt.classList.toggle('switch_active')
        circle.classList.toggle('circle_right')
        circle.classList.toggle('circle_left')
        if (flag == 0) {
            removeMapMousemove(map)
            $('#coordInfoContainer').show()
            $('#coord').css('padding', '10px')
            map.addEventListener('mousemove', MapMousemove)
            flag = 1
        } else {
            map.removeEventListener('mousemove', MapMousemove)
            $('#coordInfoContainer').hide()
            $('#coord').css('padding', '0px')
            flag = 0
        }
    })
    function removeMapMousemove(map) {
        map.removeEventListener('mousemove', MapMousemove)
    }

    function MapMousemove(e) {
        var jd = e.lnglat.getLng().toFixed(5)
        var wd = e.lnglat.getLat().toFixed(5)
        var info = `经度:${jd}:纬度${wd}`
        $('#coord').text(info)
    }
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
        'http://localhost:8080/geoserver/wcs' +
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

    let wcsURL2 =
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


    const demData = await fetch(wcsURL2)
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

    const meshMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444,
        wireframe: true
    })

    var mesh_dem = new THREE.Mesh(geometry, meshMaterial)
    mesh_dem.name = m_meshname
    //mesh是右手坐标系，z值朝屏幕外，所以绕x轴向上旋转
    mesh_dem.rotation.x = -Math.PI / 2
    camera.position.set(0, 5, 3.5)
    return [mesh_dem, minElevation, maxElevation, geometry]
}

//resise,drag three窗口
function init3DViewDragResize(domID) {
    interact('#' + domID)
        .resizable({
            edges: { left: true, right: true, bottom: true, top: false },
            ignoreFrom: '.three_container',
            modifiers: [
                interact.modifiers.restrictEdges({
                    outer: 'parent'
                }),
                interact.modifiers.restrictSize({
                    min: { width: 10, height: 10 }
                })
            ],
            inertia: true,
            listeners: {
                move: function (event) {
                    // 更新 DOM 尺寸
                    const target = event.target
                    target.style.width = event.rect.width + 'px'
                    target.style.height = event.rect.height + 'px'
                    // 同步更新 Scene
                    updateSceneSize(event.rect.width - 10, event.rect.height - 40)
                }
            }
        })
        .draggable({
            allowFrom: '.v_header',
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            listeners: {
                move: function (event) {
                    const target = event.target
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

                    target.style.transform = `translate(${x}px, ${y}px)`
                    target.setAttribute('data-x', x)
                    target.setAttribute('data-y', y)
                }
            }
        })
}

//根据dom动态调整scene
function updateSceneSize(width, height) {
    renderer1.setSize(width, height)
    camera1.aspect = width / height
    camera1.updateProjectionMatrix()
    renderer1.render(scene1, camera1)
    $('#threeCon1').css('width', width)
    $('#threeCon1').css('height', height)
}