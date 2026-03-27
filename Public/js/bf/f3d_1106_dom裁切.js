//工具函数-----------------

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

//从天地图获取DWMTS切片(img)
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

//查找mesh
function getMeshByName(m_scene, m_name) {
    let targetMesh = null
    m_scene.traverse(function (object) {
        if (object.isMesh && object.name === m_name) {
            targetMesh = object
        }
    })
    return targetMesh
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

//工具函数-----------------

//测试用--加入yaBridge
function test_add_ya_bridge_point(bridge_list) {
    var qlIconUrl = '/Public/imgs/bridge.png'
    var icon = new T.Icon({
        iconUrl: qlIconUrl, //请求图标图片的URL
        iconSize: new T.Point(15, 15), //图标可视区域的大小。
        iconAnchor: new T.Point(7.5, 7.5) //图标的定位锚点
    })
    $.get('http://localhost:8080/localGEO/getYABridge').then(res => {
        res.forEach(b => {
            const b_jd = parseFloat(b.geometry.split(' ')[0].split('(')[1]).toFixed(5)
            const b_wd = parseFloat(
                b.geometry.split(' ')[1].replace(')', '')
            ).toFixed(5)
            bridge_list.push([b_jd, b_wd, b.bridgeName])
            var bridge_pos_tdt = new T.LngLat(b_jd, b_wd)
            var marker = new T.Marker(bridge_pos_tdt, {
                icon: icon
            })
            map.addOverLay(marker)
        })
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
    const renderer = new THREE.WebGLRenderer({ antialias: true })
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
        'http://localhost:8080/geoserver/wcs' +
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
    camera.position.set(0, 2, 3.5)
    return [mesh_dem, minElevation, maxElevation, geometry]
}

//生成mesh_compass
async function c_mesh_compass(bbox_dem, mesh_name) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FontLoader()
        loader.load(
            '/Public/fonts/helvetiker_regular.typeface.json',
            function (font) {
                const textGeometry = new THREE.TextGeometry('N', {
                    font: font,
                    size: 0.2,
                    height: 0.03,
                    curveSegments: 1,
                    bevelEnabled: false
                })
                // const textMaterial = new THREE.MeshPhongMaterial({ color: 0x049ef4 });
                const textMaterial = new THREE.MeshBasicMaterial({ color: 0x049ef4 }) //不受光照影响
                const mesh_n_arrow = new THREE.Mesh(textGeometry, textMaterial)
                mesh_n_arrow.name = mesh_name
                textGeometry.computeBoundingBox()

                const text_pos = new THREE.Vector3(0, bbox_dem.max.y, bbox_dem.min.z)
                mesh_n_arrow.position.copy(text_pos)

                resolve(mesh_n_arrow)
            },
            undefined,
            reject
        )
    })
}

//生成bridge_point_list
async function c_point_bridge(scene, meshDem, bboxDem, bridgePointList, bboxGeo) {
    const raycaster = new THREE.Raycaster()
    const fontSize = calFontSizeByGeoBBox(bboxGeo)
    const loader = new THREE.FontLoader()

    deleteGroup(scene, 'bridge_group')
    const bridgeGroup = new THREE.Group()
    bridgeGroup.name = 'bridge_group'

    //筛选点
    const inBboxPointList = []
    bridgePointList.forEach(p => {
        const p_pos_tdt = new T.LngLat(p[0], p[1])
        if (bboxGeo.contains(p_pos_tdt)) {
            inBboxPointList.push([p[0], p[1], p[2]])
        }
    })

    const geoBoundsMinX = bboxGeo.getSouthWest().getLng()
    const geoBoundsMinY = bboxGeo.getSouthWest().getLat()
    const geoBoundsMaxX = bboxGeo.getNorthEast().getLng()
    const geoBoundsMaxY = bboxGeo.getNorthEast().getLat()
    const geoWidth = geoBoundsMaxX - geoBoundsMinX
    const geoHeight = geoBoundsMaxY - geoBoundsMinY
    const demWidth = bboxDem.max.x - bboxDem.min.x
    const demHeight = bboxDem.max.z - bboxDem.min.z

    //标志点大小
    const mesh_col = meshDem.geometry.parameters.widthSegments
    const mesh_row = meshDem.geometry.parameters.heightSegments
    const spere_radius = 100 / Math.min(mesh_col / geoWidth, mesh_row / geoHeight)

    for (let i = 0; i < inBboxPointList.length; i++) {
        const geoPoint = [inBboxPointList[i][0], inBboxPointList[i][1]]
        //平面
        const three_pos_x = ((geoPoint[0] - geoBoundsMinX) * demWidth) / geoWidth //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
        const three_pos_z = ((geoPoint[1] - geoBoundsMinY) * demHeight) / geoHeight //将选择框缩放至dem大小，p点位置距dem左上角y距离等比缩放
        let three_pos_x_trans = three_pos_x - demWidth / 2 //左上坐标系平移至中间点坐标系
        let three_pos_z_trans = demHeight / 2 - three_pos_z //左上坐标系平移至中间点坐标
        //*****先判断点是否刚好在边界上,若在,需要偏移极小量,否则不能相交
        if (Math.abs(three_pos_x_trans - bboxDem.min.x) < 0.00000001) {
            three_pos_x_trans += 0.00000001;
        } else if (Math.abs(three_pos_x_trans - bboxDem.max.x) < 0.00000001) {
            three_pos_x_trans -= 0.00000001;
        } else if (Math.abs(three_pos_z_trans - bboxDem.min.z) < 0.00000001) {
            three_pos_z_trans += 0.00000001;
        } else if (Math.abs(three_pos_z_trans - bboxDem.max.z) < 0.00000001) {
            three_pos_z_trans -= 0.00000001;
        }

        //高程
        const startY = meshDem.geometry.boundingBox.max.y + 10
        const direction = new THREE.Vector3(0, -1, 0)
        const rayOrigin = new THREE.Vector3(
            three_pos_x_trans,
            startY,
            three_pos_z_trans
        )
        raycaster.set(rayOrigin, direction)
        const intersects = raycaster.intersectObjects([meshDem])
        if (intersects.length > 0) {
            const point = intersects[0].point
            const geometry = new THREE.SphereGeometry(spere_radius, 16, 16)
            const material = new THREE.MeshBasicMaterial({ color: '#049ef4' })
            const sphere = new THREE.Mesh(geometry, material)
            sphere.position.copy(point)
            bridgeGroup.add(sphere)

            loader.load(
                '/Public/fonts/FangSong_GB2312_Regular.json', function () {
                    const scale = fontSize <= 8 ? 8 : 4
                    // 创建高分辨率Canvas
                    const canvas = document.createElement('canvas')
                    const context = canvas.getContext('2d', { willReadFrequently: true })
                    const baseWidth = 256
                    const baseHeight = 256
                    canvas.width = baseWidth * scale
                    canvas.height = baseHeight * scale
                    context.scale(scale, scale)
                    // 设置字体
                    const fontFamily = 'Arial, sans-serif' // 使用系统默认无衬线字体
                    context.font = `bold ${fontSize}px ${fontFamily}`
                    context.textAlign = 'center'
                    context.textBaseline = 'middle'
                    // 测量文字
                    const metrics = context.measureText(inBboxPointList[i][2])
                    const textWidth = metrics.width
                    const textHeight = fontSize
                    // 计算背景参数（动态内边距）
                    const paddingH = Math.max(2, fontSize * 0.4)
                    const paddingV = Math.max(1, fontSize * 0.3)
                    const bgWidth = textWidth + paddingH * 2
                    const bgHeight = textHeight + paddingV * 2
                    const centerX = baseWidth / 2
                    const centerY = baseHeight / 2
                    const bgX = centerX - bgWidth / 2
                    const bgY = centerY - bgHeight / 2
                    // 像素对齐
                    const alignedBgX = Math.floor(bgX) + 0.5
                    const alignedBgY = Math.floor(bgY) + 0.5
                    const alignedBgWidth = Math.floor(bgWidth)
                    const alignedBgHeight = Math.floor(bgHeight)
                    // 绘制背景
                    context.fillStyle = '#ffffff'
                    context.fillRect(
                        alignedBgX,
                        alignedBgY,
                        alignedBgWidth,
                        alignedBgHeight
                    )
                    // 文字位置像素对齐
                    const textX = Math.floor(centerX) + 0.5
                    const textY = Math.floor(centerY) + 0.5
                    // 绘制文字
                    context.fillStyle = '#049ef4'
                    context.fillText(inBboxPointList[i][2], textX, textY)
                    // 创建 Three.js 纹理和精灵
                    const texture = new THREE.CanvasTexture(canvas)
                    const spriteMaterial = new THREE.SpriteMaterial({
                        map: texture,
                        transparent: true
                    })
                    const p_radius = sphere.geometry.parameters.radius
                    const sprite = new THREE.Sprite(spriteMaterial)
                    const text_pos = new THREE.Vector3(
                        point.x,
                        point.y + p_radius * 2,
                        point.z
                    )
                    sprite.position.copy(text_pos)
                    bridgeGroup.add(sprite)
                })

        } else {
            //有没有交叉到的点
            console.log(bboxDem, inBboxPointList[i], three_pos_x_trans, three_pos_z_trans)
        }
        scene.add(bridgeGroup)
    }
    return bridgeGroup
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

    let fontSize
    if (geoSize < 0.001) {
        // 很小范围（约100米内）
        fontSize = 24
    } else if (geoSize < 0.01) {
        // 小范围（约1公里内）
        fontSize = 12
    } else if (geoSize < 0.1) {
        // 中等范围（约10公里内）
        fontSize = 6
    } else if (geoSize < 1) {
        // 大范围（约100公里内）
        fontSize = 6
    } else {
        // 超大范围（100公里以上）
        fontSize = 6
    }
    fontSize = Math.max(4, Math.min(36, fontSize))

    return fontSize
}

//生成标注_使用精灵方式(通过canvas生成，不受scene光照、视角影响)
function c_label_bridge(pointGeo, fontSize) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FontLoader()
        loader.load(
            '/Public/fonts/FangSong_GB2312_Regular.json',
            function (font) {
                const labelList = []
                pointGeo.forEach(p => {
                    const scale = fontSize <= 8 ? 8 : 4

                    // 创建高分辨率Canvas
                    const canvas = document.createElement('canvas')
                    const context = canvas.getContext('2d', { willReadFrequently: true })
                    const baseWidth = 256
                    const baseHeight = 256
                    canvas.width = baseWidth * scale
                    canvas.height = baseHeight * scale
                    context.scale(scale, scale)

                    // 设置字体
                    const fontFamily = 'Arial, sans-serif' // 使用系统默认无衬线字体
                    context.font = `bold ${fontSize}px ${fontFamily}`
                    context.textAlign = 'center'
                    context.textBaseline = 'middle'

                    // 测量文字
                    const metrics = context.measureText(p[1])
                    const textWidth = metrics.width
                    const textHeight = fontSize

                    // 计算背景参数（动态内边距）
                    const paddingH = Math.max(2, fontSize * 0.4)
                    const paddingV = Math.max(1, fontSize * 0.3)
                    const bgWidth = textWidth + paddingH * 2
                    const bgHeight = textHeight + paddingV * 2

                    const centerX = baseWidth / 2
                    const centerY = baseHeight / 2
                    const bgX = centerX - bgWidth / 2
                    const bgY = centerY - bgHeight / 2

                    // 像素对齐
                    const alignedBgX = Math.floor(bgX) + 0.5
                    const alignedBgY = Math.floor(bgY) + 0.5
                    const alignedBgWidth = Math.floor(bgWidth)
                    const alignedBgHeight = Math.floor(bgHeight)

                    // 绘制背景
                    context.fillStyle = '#ffffff'
                    context.fillRect(
                        alignedBgX,
                        alignedBgY,
                        alignedBgWidth,
                        alignedBgHeight
                    )

                    // 文字位置像素对齐
                    const textX = Math.floor(centerX) + 0.5
                    const textY = Math.floor(centerY) + 0.5

                    // 绘制文字
                    context.fillStyle = '#049ef4'
                    context.fillText(p[1], textX, textY)

                    // 创建 Three.js 纹理和精灵
                    const texture = new THREE.CanvasTexture(canvas)
                    const spriteMaterial = new THREE.SpriteMaterial({
                        map: texture,
                        transparent: true
                    })
                    const p_radius = p[0].geometry.parameters.radius
                    const sprite = new THREE.Sprite(spriteMaterial)
                    sprite.name = p[1]
                    sprite.scale.set(1, 1, 1)
                    const text_pos = new THREE.Vector3(
                        p[0].position.x,
                        p[0].position.y + p_radius * 2,
                        p[0].position.z
                    )
                    sprite.position.copy(text_pos)
                    labelList.push(sprite)
                })
                resolve(labelList)
            },
            undefined,
            reject
        )
    })
}

//多层(img + cia)Tile_裁切
async function c_dom_img_cia(bbox) {
    const zoom = 18
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
                // url: getTileWMTSUrlCIA(col, row, zoom),
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
    const geoWidth = lastTile_se_x - firstTile_nw_x
    const geoHeight = lastTile_se_y - firstTile_nw_y
    //计算像素比例
    const pixelsPerDegreeX = canvasWidth / geoWidth
    const pixelsPerDegreeY = canvasHeight / geoHeight
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
function loadImage(url, timeout = 50000) {
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

//加载纹理
async function loadTexture(mesh, texture) {
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(texture.toDataURL('image/png'), function (texture) {
        mesh.material.map = texture
        mesh.material.side = THREE.DoubleSide
        mesh.material.needsUpdate = true
    })
}

//清除point
function clearMarkers(map, geomarkers, scene, demmarkers) {
    geomarkers.forEach(gm => {
        map.removeOverLay(gm)
    })
    demmarkers.forEach(dm => {
        scene.remove(dm)
    })
}

//删除mesh
function deleteMesh(scene, meshName) {
    var mesh = scene.getObjectByName(meshName)
    if (mesh) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
    }
}

function deleteGroup(scene, groupName) {
    const group = scene.getObjectByName(groupName);
    if (group) {
        scene.remove(group)
    }
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

//注册交互点击
function initClick(drawRect, tdtMap, scene, render, camera, demMesh, bboxGeo) {
    const bbox_dem = new THREE.Box3().setFromObject(demMesh)
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    let dem_marker
    let geo_marker

    $('#threeCon1').on('mouseenter', function () {
        let mouseDownTime = 0
        $(this).off('mousedown mouseup')
        $(this).on('mousedown', function () {
            mouseDownTime = Date.now()
        })

        $(this).on('mouseup', function (mouseUpEvent) {
            const mouseUpTime = Date.now()
            const timeInterval = mouseUpTime - mouseDownTime
            if (timeInterval < 200) {
                ThreeClickHD(mouseUpEvent, tdtMap, render, camera, demMesh)
            }
            mouseDownTime = 0
        })
    })

    $('#threeCon1').on('mouseleave', function () {
        $(this).off('mousedown mouseup')
        $(document).off('mousemove.dragCheck')
    })

    //3D窗口点击事件
    function ThreeClickHD(event, tdtMap, render, camera, mesh) {
        const canvas = render.domElement
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        mouse.x = (x / canvas.clientWidth) * 2 - 1
        mouse.y = -(y / canvas.clientHeight) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects([mesh])

        //计算dem_mesh宽高
        const bbox = new THREE.Box3().setFromObject(mesh)
        const dem_width = bbox.max.x - bbox.min.x
        const dem_height = bbox.max.z - bbox.min.z

        //计算geo宽高
        const minX = bboxGeo.getSouthWest().lng
        const minY = bboxGeo.getSouthWest().lat
        const maxX = bboxGeo.getNorthEast().lng
        const maxY = bboxGeo.getNorthEast().lat
        const geo_width = maxX - minX
        const geo_height = maxY - minY

        const scale = Math.min(dem_width / geo_width, dem_height / geo_height)

        if (intersects.length > 0) {
            const point = intersects[0].point
            if (!dem_marker) {
                // const markerGeometry = new THREE.SphereGeometry(scale * 0.0002, 16, 16);
                const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16)
                const markerMaterial = new THREE.MeshBasicMaterial({
                    color: '#1299ed'
                })

                dem_marker = new THREE.Mesh(markerGeometry, markerMaterial)
                dem_marker.position.copy(point)
                scene.add(dem_marker)
                dem_marker_list.push(dem_marker)
            } else {
                dem_marker.position.copy(point)
            }
            //canvas点_中心坐标系
            var canvas_x = intersects[0].point.x
            var canvas_z = intersects[0].point.z
            //canvas点_左上坐标系
            const p_x = canvas_x + dem_width / 2
            const p_y = dem_height / 2 - canvas_z

            //geo点
            const p_x_geo = minX + (p_x * geo_width) / dem_width
            const p_y_geo = minY + (p_y * geo_height) / dem_height

            if (!geo_marker) {
                geo_marker = new T.Circle(new T.LngLat(p_x_geo, p_y_geo), 2, {
                    weight: 0,
                    fillColor: '#e66529',
                    fillOpacity: 1,
                    name: 'geo_marker'
                })
                tdtMap.addOverLay(geo_marker)
                geo_marker_list.push(geo_marker)
            } else {
                geo_marker.setCenter(new T.LngLat(p_x_geo, p_y_geo))
            }
        }
    }

    drawRect.removeEventListener('mousedown')
    drawRect.addEventListener('mousedown', e =>
        TDTClickHD(e, tdtMap, bbox_dem, bboxGeo, demMesh)
    )

    //天地图矩形内点击事件
    async function TDTClickHD(e, tdtMap, bboxDem, bboxGeo, meshDem) {
        //map中添加点
        const jd = e.lnglat.lng
        const wd = e.lnglat.lat
        if (!geo_marker) {
            geo_marker = new T.Circle(new T.LngLat(jd, wd), 2, {
                weight: 0,
                fillColor: '#e66529',
                fillOpacity: 1,
                name: 'geo_marker'
            })
            tdtMap.addOverLay(geo_marker)
            geo_marker_list.push(geo_marker)
        } else {
            geo_marker.setCenter(new T.LngLat(jd, wd))
        }

        c_point_tdt_click_point_ins([jd, wd], bboxDem, bboxGeo, meshDem)
    }

    //射线交叉计算y值
    function c_point_tdt_click_point_ins(point, bbox_dem, bboxGeo, meshDem) {
        //1.计算x和z值
        const dragBoxMinX = bboxGeo.getSouthWest().getLng()
        const dragBoxMinY = bboxGeo.getSouthWest().getLat()
        const dragBoxMaxX = bboxGeo.getNorthEast().getLng()
        const dragBoxMaxY = bboxGeo.getNorthEast().getLat()
        const geo_width = dragBoxMaxX - dragBoxMinX
        const geo_height = dragBoxMaxY - dragBoxMinY
        const dem_width = bbox_dem.max.x - bbox_dem.min.x
        const dem_height = bbox_dem.max.z - bbox_dem.min.z

        //---------------以左下角为原坐标系的原点---------------/
        //x方向 ：以左边为参考点
        const three_pos_x = ((point[0] - dragBoxMinX) * dem_width) / geo_width //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
        const three_pos_x_trans = three_pos_x - dem_width / 2 //左上坐标系平移至中间点坐标系
        //y方向：以下边为参考点
        const three_pos_z = ((point[1] - dragBoxMinY) * dem_height) / geo_height
        const three_pos_z_trans = dem_height / 2 - three_pos_z //左下坐标系平移至中间点坐标系

        //---------------以左上角为原坐标系的原点---------------/
        //y方向：以上边为参考点
        // const three_pos_z = (dragBoxMaxY - point[1]) * dem_height / geo_height
        // const three_pos_z_trans = three_pos_z -  (dem_height / 2)
        //2.计算y值
        const startY = meshDem.geometry.boundingBox.max.y + 10
        const direction = new THREE.Vector3(0, -1, 0)
        const rayOrigin = new THREE.Vector3(
            three_pos_x_trans,
            startY,
            three_pos_z_trans
        )
        raycaster.set(rayOrigin, direction)
        const intersects = raycaster.intersectObjects([meshDem])
        if (intersects.length > 0) {
            const point = intersects[0].point
            if (!dem_marker) {
                const scale = Math.min(dem_width / geo_width, dem_height / geo_height)
                // const geometry = new THREE.SphereGeometry(scale * 0.0002, 16, 16);
                const geometry = new THREE.SphereGeometry(0.08, 16, 16)
                // const colCount = meshDem.geometry.parameters.widthSegments

                const material = new THREE.MeshBasicMaterial({ color: '#1299ed' })
                dem_marker = new THREE.Mesh(geometry, material)
                dem_marker.position.copy(point)
                scene.add(dem_marker)
                dem_marker_list.push(dem_marker)
            } else {
                dem_marker.position.copy(point)
            }
        }
    }
}

//计算范围框内的河流
async function cal_riv_intersects(rivList, bboxGeo) {
    const riv_ins = []
    const NE = bboxGeo.getNorthEast()
    const SW = bboxGeo.getSouthWest()
    const minX = SW.lng
    const minY = SW.lat
    const maxX = NE.lng
    const maxY = NE.lat

    rivList.forEach(river => {
        //用bboxGeo与riverBouds作交叉检查，初步筛选河流
        if (bboxGeo.intersects(river[0].getBounds())) {
            const riv_coords = river[0].getLngLats()
            const point_in_bbox_list = []
            //遍历初筛后的河流点，若有点在bbox内(bboxGeo.contains),记录每个点的index
            const p_index = []
            for (let i = 0; i < riv_coords.length; i++) {
                //点在bbox内
                if (bboxGeo.contains(riv_coords[i])) {
                    //*****点不在bbox的边线上(否则边界上的点会重复)
                    if (
                        riv_coords[i].lng != minX &&
                        riv_coords[i].lng != maxX &&
                        riv_coords[i].lat != minY &&
                        riv_coords[i].lat != maxY
                    ) {
                        point_in_bbox_list.push(riv_coords[i])
                        p_index.push(i)
                    }
                }
            }

            //index列表长度>0时，河流有点在bbox内
            if (p_index.length > 0) {
                //先判断是否反复穿插
                let isSingleLine = true
                for (let i = 0; i < p_index.length - 1; i++) {
                    if (p_index[i] + 1 != p_index[i + 1]) {
                        isSingleLine = false
                    }
                }
                //反复穿插
                if (!isSingleLine) {
                    //1.起、终点都在bbox内
                    if (p_index[0] == 0 && p_index.at(-1) == riv_coords.length - 1) {
                        // console.log(river[1], 'c1')
                        //1.1.计算入或出时，在bounds内的最近的点的index
                        let near_bounds_point_index = []
                        for (let i = 0; i < p_index.length - 1; i++) {
                            if (p_index[i + 1] - p_index[i] != 1) {
                                near_bounds_point_index.push(p_index[i])
                                near_bounds_point_index.push(p_index[i + 1])
                            }
                        }
                        //1.2.生成最临近边界处的交叉线
                        const cross_line_list = []
                        for (let i = 0; i < near_bounds_point_index.length; i++) {
                            if (i % 2 == 0) {
                                const seg1_sp = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                const seg1_ep = [
                                    riv_coords[near_bounds_point_index[i] + 1].lng,
                                    riv_coords[near_bounds_point_index[i] + 1].lat
                                ]
                                cross_line_list.push([seg1_sp, seg1_ep])
                            } else {
                                const seg2_sp = [
                                    riv_coords[near_bounds_point_index[i] - 1].lng,
                                    riv_coords[near_bounds_point_index[i] - 1].lat
                                ]
                                const seg2_ep = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                cross_line_list.push([seg2_sp, seg2_ep])
                            }
                        }
                        //生成交叉线后再构造完整的index列表，否则1.2会多生成cross_line
                        near_bounds_point_index.unshift(0) //加入起点index
                        near_bounds_point_index.push(riv_coords.length - 1) //加入终点index
                        //1.3.计算边界四边与交叉线的交点
                        const cross_point_list = []
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        for (let i = 0; i < cross_line_list.length; i++) {
                            ins_bounds_lines.forEach(l => {
                                const ins_point1 = linesIntersectWithPoint(
                                    cross_line_list[i],
                                    l
                                )
                                if (ins_point1.intersects) {
                                    cross_point_list.push(ins_point1.intersectionPoint)
                                    //图上标示交点
                                    // var circle = new T.Circle(
                                    //     new T.LngLat(
                                    //         ins_point1.intersectionPoint[0],
                                    //         ins_point1.intersectionPoint[1]
                                    //     ), 5);

                                    // map.addOverLay(circle)
                                    // geo_marker_list.push(circle)
                                }
                            })
                        }
                        //1.4.将point_in_bbox_list切分
                        for (let i = 0; i < near_bounds_point_index.length / 2; i++) {
                            //near_bounds_point_index[i*2+1] + 1：第一个+1为index，第二个为slice包裹后面那个点
                            const slice = riv_coords.slice(
                                near_bounds_point_index[i * 2],
                                near_bounds_point_index[i * 2 + 1] + 1
                            )
                            //第一段
                            if (i == 0) {
                                slice.push(
                                    new T.LngLat(cross_point_list[i][0], cross_point_list[i][1])
                                )
                            }
                            //最后一段
                            else if (i == near_bounds_point_index.length / 2 - 1) {
                                slice.unshift(
                                    new T.LngLat(
                                        cross_point_list[i * 2 - 1][0],
                                        cross_point_list[i * 2 - 1][1]
                                    )
                                )
                            }
                            //中间段
                            else {
                                slice.unshift(
                                    new T.LngLat(
                                        cross_point_list[i * 2 - 1][0],
                                        cross_point_list[i * 2 - 1][1]
                                    )
                                )
                                slice.push(
                                    new T.LngLat(
                                        cross_point_list[i * 2][0],
                                        cross_point_list[i * 2][1]
                                    )
                                )
                            }
                            riv_ins.push([slice, river[1]])
                            var line = new T.Polyline(slice, {
                                color: 'blue',
                                weight: 3,
                                opacity: 0.8,
                                lineStyle: 'dashed'
                            })
                            map.addOverLay(line)
                            geo_marker_list.push(line)
                        }
                    }
                    //2.只有终点在bbox内
                    else if (p_index[0] != 0 && p_index.at(-1) == riv_coords.length - 1) {
                        // console.log(river[1], 'c2')
                        //2.1.计算入或出时，在bounds内的最近的点的index
                        let near_bounds_point_index = []
                        near_bounds_point_index.push(p_index[0])
                        for (let i = 0; i < p_index.length - 1; i++) {
                            if (p_index[i + 1] - p_index[i] != 1) {
                                near_bounds_point_index.push(p_index[i])
                                near_bounds_point_index.push(p_index[i + 1])
                            }
                        }
                        //2.2.生成最临近边界处的交叉线
                        const cross_line_list = []
                        for (let i = 0; i < near_bounds_point_index.length; i++) {
                            if (i % 2 == 0) {
                                const seg1_sp = [
                                    riv_coords[near_bounds_point_index[i] - 1].lng,
                                    riv_coords[near_bounds_point_index[i] - 1].lat
                                ]
                                const seg1_ep = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                cross_line_list.push([seg1_sp, seg1_ep])
                            } else {
                                const seg2_sp = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                const seg2_ep = [
                                    riv_coords[near_bounds_point_index[i] + 1].lng,
                                    riv_coords[near_bounds_point_index[i] + 1].lat
                                ]
                                cross_line_list.push([seg2_sp, seg2_ep])
                            }
                        }
                        //生成交叉线后再构造完整的index列表，否则2.2会多生成cross_line
                        near_bounds_point_index.push(riv_coords.length - 1) //加入终点index
                        //2.3.计算边界四边与交叉线的交点
                        const cross_point_list = []
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        for (let i = 0; i < cross_line_list.length; i++) {
                            ins_bounds_lines.forEach(l => {
                                const ins_point1 = linesIntersectWithPoint(
                                    cross_line_list[i],
                                    l
                                )
                                if (ins_point1.intersects) {
                                    cross_point_list.push(ins_point1.intersectionPoint)
                                }
                            })
                        }
                        //2.4.将point_in_bbox_list切分
                        for (let i = 0; i < near_bounds_point_index.length / 2; i++) {
                            //near_bounds_point_index[i*2+1] + 1：第一个+1为index，第二个为slice包裹后面那个点
                            const slice = riv_coords.slice(
                                near_bounds_point_index[i * 2],
                                near_bounds_point_index[i * 2 + 1] + 1
                            )
                            //最后一段
                            if (i == near_bounds_point_index.length / 2 - 1) {
                                slice.unshift(
                                    new T.LngLat(
                                        cross_point_list[i * 2][0],
                                        cross_point_list[i * 2][1]
                                    )
                                )
                            } else {
                                slice.unshift(
                                    new T.LngLat(
                                        cross_point_list[i * 2][0],
                                        cross_point_list[i * 2][1]
                                    )
                                )
                                slice.push(
                                    new T.LngLat(
                                        cross_point_list[i * 2 + 1][0],
                                        cross_point_list[i * 2 + 1][1]
                                    )
                                )
                            }

                            riv_ins.push([slice, river[1]])
                            var line = new T.Polyline(slice, {
                                color: 'blue',
                                weight: 3,
                                opacity: 0.8,
                                lineStyle: 'dashed'
                            })
                            map.addOverLay(line)
                            geo_marker_list.push(line)
                        }
                    }
                    //3.只有起点在bbox内
                    else if (p_index[0] == 0 && p_index.at(-1) != riv_coords.length - 1) {
                        // console.log(river[1], 'c3')
                        //3.1.计算入或出时，在bounds内的最近的点的index
                        let near_bounds_point_index = []
                        for (let i = 0; i < p_index.length - 1; i++) {
                            if (p_index[i + 1] - p_index[i] != 1) {
                                near_bounds_point_index.push(p_index[i])
                                near_bounds_point_index.push(p_index[i + 1])
                            }
                        }
                        near_bounds_point_index.push(p_index.at(-1))
                        //3.2.生成最临近边界处的交叉线
                        const cross_line_list = []
                        for (let i = 0; i < near_bounds_point_index.length; i++) {
                            if (i % 2 == 0) {
                                const seg1_sp = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                const seg1_ep = [
                                    riv_coords[near_bounds_point_index[i] + 1].lng,
                                    riv_coords[near_bounds_point_index[i] + 1].lat
                                ]
                                cross_line_list.push([seg1_sp, seg1_ep])
                            } else {
                                const seg2_sp = [
                                    riv_coords[near_bounds_point_index[i] - 1].lng,
                                    riv_coords[near_bounds_point_index[i] - 1].lat
                                ]
                                const seg2_ep = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                cross_line_list.push([seg2_sp, seg2_ep])
                            }
                        }
                        //生成交叉线后再构造完整的index列表，否则3.2会多生成cross_line
                        near_bounds_point_index.unshift(p_index[0]) //加入终点index
                        //3.3.计算边界四边与交叉线的交点
                        const cross_point_list = []
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        for (let i = 0; i < cross_line_list.length; i++) {
                            ins_bounds_lines.forEach(l => {
                                const ins_point1 = linesIntersectWithPoint(
                                    cross_line_list[i],
                                    l
                                )
                                if (ins_point1.intersects) {
                                    cross_point_list.push(ins_point1.intersectionPoint)
                                }
                            })
                        }
                        //3.4.将point_in_bbox_list切分
                        for (let i = 0; i < near_bounds_point_index.length / 2; i++) {
                            //near_bounds_point_index[i*2+1] + 1：第一个+1为index，第二个为slice包裹后面那个点
                            const slice = riv_coords.slice(
                                near_bounds_point_index[i * 2],
                                near_bounds_point_index[i * 2 + 1] + 1
                            )
                            //第一段
                            if (i == 0) {
                                slice.push(
                                    new T.LngLat(
                                        cross_point_list[i * 2][0],
                                        cross_point_list[i * 2][1]
                                    )
                                )
                            } else {
                                slice.unshift(
                                    new T.LngLat(
                                        cross_point_list[i * 2 - 1][0],
                                        cross_point_list[i * 2 - 1][1]
                                    )
                                )
                                slice.push(
                                    new T.LngLat(
                                        cross_point_list[i * 2][0],
                                        cross_point_list[i * 2][1]
                                    )
                                )
                            }

                            riv_ins.push([slice, river[1]])
                            var line = new T.Polyline(slice, {
                                color: 'blue',
                                weight: 3,
                                opacity: 0.8,
                                lineStyle: 'dashed'
                            })
                            map.addOverLay(line)
                            geo_marker_list.push(line)
                        }
                    }
                    //4.起、终点都不在bbox内
                    else {
                        // console.log(river[1], 'c4')
                        //4.1.计算入或出时，在bounds内的最近的点的index
                        let near_bounds_point_index = []
                        near_bounds_point_index.push(p_index[0])
                        for (let i = 0; i < p_index.length - 1; i++) {
                            if (p_index[i + 1] - p_index[i] != 1) {
                                near_bounds_point_index.push(p_index[i])
                                near_bounds_point_index.push(p_index[i + 1])
                            }
                        }
                        near_bounds_point_index.push(p_index.at(-1))
                        //4.2.生成最临近边界处的交叉线
                        const cross_line_list = []
                        for (let i = 0; i < near_bounds_point_index.length; i++) {
                            if (i % 2 == 0) {
                                const seg1_sp = [
                                    riv_coords[near_bounds_point_index[i] - 1].lng,
                                    riv_coords[near_bounds_point_index[i] - 1].lat
                                ]
                                const seg1_ep = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                cross_line_list.push([seg1_sp, seg1_ep])
                            } else {
                                const seg2_sp = [
                                    riv_coords[near_bounds_point_index[i]].lng,
                                    riv_coords[near_bounds_point_index[i]].lat
                                ]
                                const seg2_ep = [
                                    riv_coords[near_bounds_point_index[i] + 1].lng,
                                    riv_coords[near_bounds_point_index[i] + 1].lat
                                ]
                                cross_line_list.push([seg2_sp, seg2_ep])
                            }
                        }
                        //4.3.计算边界四边与交叉线的交点
                        const cross_point_list = []
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        for (let i = 0; i < cross_line_list.length; i++) {
                            ins_bounds_lines.forEach(l => {
                                const ins_point1 = linesIntersectWithPoint(
                                    cross_line_list[i],
                                    l
                                )
                                if (ins_point1.intersects) {
                                    cross_point_list.push(ins_point1.intersectionPoint)
                                }
                            })
                        }
                        //4.4.将point_in_bbox_list切分
                        for (let i = 0; i < near_bounds_point_index.length / 2; i++) {
                            //near_bounds_point_index[i*2+1] + 1：第一个+1为index，第二个为slice包裹后面那个点
                            const slice = riv_coords.slice(
                                near_bounds_point_index[i * 2],
                                near_bounds_point_index[i * 2 + 1] + 1
                            )
                            slice.unshift(
                                new T.LngLat(
                                    cross_point_list[i * 2][0],
                                    cross_point_list[i * 2][1]
                                )
                            )
                            slice.push(
                                new T.LngLat(
                                    cross_point_list[i * 2 + 1][0],
                                    cross_point_list[i * 2 + 1][1]
                                )
                            )
                            riv_ins.push([slice, river[1]])
                            var line = new T.Polyline(slice, {
                                color: 'blue',
                                weight: 3,
                                opacity: 0.8,
                                lineStyle: 'dashed'
                            })
                            map.addOverLay(line)
                            geo_marker_list.push(line)
                        }
                    }
                } else {
                    //5.起、终点都在bbox内
                    if (p_index.length == riv_coords.length) {
                        // console.log(river[1], 'c5')
                        riv_ins.push([point_in_bbox_list, river[1]])
                    } //6.只有终点在bbox内
                    else if (p_index[0] != 0 && p_index.at(-1) == riv_coords.length - 1) {
                        // console.log(river[1], 'c6')
                        const ins_riv_line1 = [
                            [riv_coords[p_index[0] - 1].lng, riv_coords[p_index[0] - 1].lat],
                            [riv_coords[p_index[0]].lng, riv_coords[p_index[0]].lat]
                        ]
                        //bbox的4条边生成4条线，遍历与构造的线求交点
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        ins_bounds_lines.forEach(l => {
                            //第一点和再前一个点组成的第一条线与边界线做交叉求交点
                            const ins_point1 = linesIntersectWithPoint(ins_riv_line1, l)
                            if (ins_point1.intersects) {
                                const p_lnglat = new T.LngLat(
                                    ins_point1.intersectionPoint[0],
                                    ins_point1.intersectionPoint[1]
                                )
                                //插入列表第一个点之前
                                point_in_bbox_list.unshift(p_lnglat)
                            }
                        })
                        riv_ins.push([point_in_bbox_list, river[1]])
                    } //7.只有起点在bbox内
                    else if (p_index[0] == 0 && p_index.at(-1) != riv_coords.length - 1) {
                        // console.log(river[1], 'c7')
                        const ins_riv_line1 = [
                            [riv_coords[p_index.at(-1)].lng, riv_coords[p_index.at(-1)].lat],
                            [
                                riv_coords[p_index.at(-1) + 1].lng,
                                riv_coords[p_index.at(-1) + 1].lat
                            ]
                        ]
                        //bbox的4条边生成4条线，遍历与构造的线求交点
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        ins_bounds_lines.forEach(l => {
                            //最后一个点与其后一个点组成的线与边界线做交叉求交点
                            const ins_point1 = linesIntersectWithPoint(ins_riv_line1, l)
                            if (ins_point1.intersects) {
                                const p_lnglat = new T.LngLat(
                                    ins_point1.intersectionPoint[0],
                                    ins_point1.intersectionPoint[1]
                                )
                                //插入列表末尾
                                point_in_bbox_list.push(p_lnglat)
                            }
                        })
                        riv_ins.push([point_in_bbox_list, river[1]])
                    } //8.起、终点都不在bbox内
                    else {
                        // console.log(river[1], 'c8')
                        const ins_riv_line1 = [
                            [riv_coords[p_index[0] - 1].lng, riv_coords[p_index[0] - 1].lat],
                            [riv_coords[p_index[0]].lng, riv_coords[p_index[0]].lat]
                        ]
                        const ins_riv_line2 = [
                            [riv_coords[p_index.at(-1)].lng, riv_coords[p_index.at(-1)].lat],
                            [
                                riv_coords[p_index.at(-1) + 1].lng,
                                riv_coords[p_index.at(-1) + 1].lat
                            ]
                        ]
                        //bbox的4条边生成4条线，遍历与构造的线求交点
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        ins_bounds_lines.forEach(l => {
                            //第一点和再前一个点组成的第一条线与边界线做交叉求交点
                            const ins_point1 = linesIntersectWithPoint(ins_riv_line1, l)
                            if (ins_point1.intersects) {
                                const p_lnglat = new T.LngLat(
                                    ins_point1.intersectionPoint[0],
                                    ins_point1.intersectionPoint[1]
                                )
                                //插入列表第一个点之前
                                point_in_bbox_list.unshift(p_lnglat)
                            }
                            //最后一个点与其后一个点组成的线与边界线做交叉求交点
                            const ins_point2 = linesIntersectWithPoint(ins_riv_line2, l)
                            if (ins_point2.intersects) {
                                const p_lnglat = new T.LngLat(
                                    ins_point2.intersectionPoint[0],
                                    ins_point2.intersectionPoint[1]
                                )
                                //插入列表末尾
                                point_in_bbox_list.push(p_lnglat)
                            }
                        })
                        riv_ins.push([point_in_bbox_list, river[1]])
                    }

                }
            } else {
                //9. 起、终点都不在bbox内，且没有折点在bbox内(直线段很长)
                // console.log(river[1], 'c9')
                const cross_point_list = []
                const ins_bounds_lines = c_bbox_line(bboxGeo)
                for (let i = 0; i < riv_coords.length - 1; i++) {
                    const single_line = [[riv_coords[i].lng, riv_coords[i].lat], [riv_coords[i + 1].lng, riv_coords[i + 1].lat]]
                    ins_bounds_lines.forEach(l => {
                        const ins_point1 = linesIntersectWithPoint(
                            single_line,
                            l
                        )
                        if (ins_point1.intersects) {
                            const cross_point_lnglat = new T.LngLat(ins_point1.intersectionPoint[0], ins_point1.intersectionPoint[1])
                            //与最近的起点的距离
                            const dis = riv_coords[i].distanceTo(cross_point_lnglat)
                            cross_point_list.push([ins_point1.intersectionPoint, dis])
                        }
                    })
                }
                //根据距离排序
                cross_point_list.sort((a, b) => a[1] - b[1]);
                if (cross_point_list.length > 0) {
                    const slice = [new T.LngLat(cross_point_list[0][0][0], cross_point_list[0][0][1]), new T.LngLat(cross_point_list[1][0][0], cross_point_list[1][0][1])]
                    riv_ins.push([slice, river[1]])
                    // console.log(cross_point_list)
                }
                // c



            }
        }
    })
    riv_ins.forEach(riv => {
        var line = new T.Polyline(riv[0], {
            color: 'blue',
            weight: 3,
            opacity: 0.8,
            lineStyle: 'dashed'
        })
        map.addOverLay(line)
        geo_marker_list.push(line)
    })

    return riv_ins
}

//画tdt中的dem网格线
async function drawGridAndEleLabel(demData, bounds, demOverLayerList, showLableFlag = 0) {
    // const demData = await fetch(DEMUrl)
    // const arrayBuffer = await demData.arrayBuffer()
    const tiff = await GeoTIFF.fromArrayBuffer(demData)
    const image = await tiff.getImage()
    const rasters = await image.readRasters()
    const demRange = image.getBoundingBox()
    //x,y方向的分辨率一样
    const resolution = (demRange[2] - demRange[0]) / image.getWidth()
    //便于理解,声明行列数
    const colCount = image.getWidth()
    const rowCount = image.getHeight()

    const gridLines = []
    //多划一次竖直线
    for (let i = 0; i < colCount + 1; i++) {
        const col_bottom_x = bounds[0] + resolution * i
        const col_bottom_y = bounds[1]

        const col_top_x = bounds[0] + resolution * i
        const col_top_y = bounds[3]

        //*****用于grid检查线，不添加第一根和最后一根(边界不检查相交)
        if (i != 0 && i != colCount) {
            gridLines.push([
                [col_bottom_x, col_bottom_y],
                [col_top_x, col_top_y]
            ])
        }

        const line_lnglat = [
            new T.LngLat(col_bottom_x, col_bottom_y),
            new T.LngLat(col_top_x, col_top_y)
        ]
        const line = new T.Polyline(line_lnglat, {
            color: 'green',
            weight: 1.0,
            opacity: 1.0
        })
        line.name = 'grid'
        map.addOverLay(line)
        demOverLayerList.push(line)
    }
    //多划一次水平线
    for (let i = 0; i < rowCount + 1; i++) {
        const row_left_x = bounds[0]
        const row_left_y = bounds[1] + resolution * i

        const row_right_x = bounds[2]
        const row_right_y = bounds[1] + resolution * i
        //用于grid检查线，不添加第一根和最后一根(边界不检查相交)
        if (i != 0 && i != rowCount) {
            gridLines.push([
                [row_left_x, row_left_y],
                [row_right_x, row_right_y]
            ])
        }

        const line_lnglat = [
            new T.LngLat(row_left_x, row_left_y),
            new T.LngLat(row_right_x, row_right_y)
        ]
        const line = new T.Polyline(line_lnglat, {
            color: 'green',
            weight: 1.0,
            opacity: 1.0
        })
        line.name = 'grid'
        map.addOverLay(line)
        demOverLayerList.push(line)
    }
    if (showLableFlag == 1) {
        for (let i = 0; i < rowCount; i++) {
            for (let j = 0; j < colCount; j++) {
                const ele = rasters[0][i * colCount + j]
                const label_x = demRange[0] + j * resolution
                const label_y = demRange[3] - i * resolution - resolution / 2
                const label_lnglat = new T.LngLat(label_x, label_y)
                const label = new T.Label({
                    text: `${ele.toFixed(2)}`,

                    position: label_lnglat
                })
                label.name = 'label'
                label.setFontSize(7)
                label.setBackgroundColor('#00000001')
                label.setBorderLine(0)
                label.setZindex(-1)
                demOverLayerList.push(label)
                map.addOverLay(label)
            }
        }
    }

    return gridLines
}

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

//只用于标识---mesh网格线
function createLineSegmentsWithIndexLabels(wireframeMesh, color = 0xff0000, showLabel = 0) {
    const wireframeGeometry = new THREE.WireframeGeometry(wireframeMesh.geometry)
    // 应用 mesh 的世界变换到线段几何体
    wireframeGeometry.applyMatrix4(wireframeMesh.matrixWorld)
    const material = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2
    })

    const lineSegments = new THREE.LineSegments(wireframeGeometry, material)
    lineSegments.name = 'seg_line'
    const labelsGroup = new THREE.Group()

    const positionAttribute = wireframeGeometry.getAttribute('position')

    for (let i = 0; i < positionAttribute.count; i += 2) {
        const start = new THREE.Vector3()
        const end = new THREE.Vector3()
        start.fromBufferAttribute(positionAttribute, i)
        end.fromBufferAttribute(positionAttribute, i + 1)

        // 转换到世界坐标
        wireframeMesh.localToWorld(start)
        wireframeMesh.localToWorld(end)
        if (showLabel == 1) {
            // 计算线段中点位置
            const midpoint = new THREE.Vector3()
                .addVectors(start, end)
                .multiplyScalar(0.5)
            midpoint.z += 0.1
            // 创建索引标签
            const label = createIndexLabel(i / 2, midpoint)
            labelsGroup.add(label)
        }

    }

    // 创建包含线段和标签的组
    const resultGroup = new THREE.Group()
    resultGroup.add(lineSegments)
    resultGroup.add(labelsGroup)
    resultGroup.name = 'seg_group'

    return resultGroup
}

//只用于标识---mesh网格线标注
function createIndexLabel(index, position, color = 0xffffff, bgColor = 0x000000) {
    // 创建画布来渲染文本
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = 64
    canvas.height = 32

    // 绘制背景
    context.fillStyle = `rgb(${bgColor === 0x000000 ? '0,0,0' : '255,255,255'})`
    context.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制文本
    context.font = 'bold 20px Arial'
    context.fillStyle = `rgb(${color === 0xffffff ? '255,255,255' : '0,0,0'})`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(index.toString(), canvas.width / 2, canvas.height / 2)

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    // 创建精灵材质
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    })

    // 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.position.copy(position)
    sprite.scale.set(0.5, 0.25, 1) // 调整标签大小
    sprite.userData = { index: index }
    sprite.name = 'seg_line_label'

    return sprite
}

//生成河流线_静态
async function c_polyline_riv(scene, meshDem, bboxDem, riverInsList, bboxGeo) {
    const raycaster = new THREE.Raycaster()

    deleteGroup(scene, 'riv_sphere_group')
    const rivSphereGroup = new THREE.Group()
    rivSphereGroup.name = 'riv_sphere_group'

    deleteGroup(scene, 'cross_sphere_group')
    const crossSphereGroup = new THREE.Group()
    crossSphereGroup.name = 'cross_sphere_group'

    deleteGroup(scene, 'riv_polyline_group')
    const rivPolylineGroup = new THREE.Group()
    rivPolylineGroup.name = 'riv_polyline_group'


    const geoBoundsMinX = bboxGeo.getSouthWest().getLng()
    const geoBoundsMinY = bboxGeo.getSouthWest().getLat()
    const geoBoundsMaxX = bboxGeo.getNorthEast().getLng()
    const geoBoundsMaxY = bboxGeo.getNorthEast().getLat()
    const geoWidth = geoBoundsMaxX - geoBoundsMinX
    const geoHeight = geoBoundsMaxY - geoBoundsMinY
    const demWidth = bboxDem.max.x - bboxDem.min.x
    const demHeight = bboxDem.max.z - bboxDem.min.z

    //标志点大小
    const mesh_col = meshDem.geometry.parameters.widthSegments
    const mesh_row = meshDem.geometry.parameters.heightSegments
    const spere_radius =50/ Math.min(mesh_col / geoWidth, mesh_row / geoHeight)

    //将riv_point转为three坐标
    for (let i = 0; i < riverInsList.length; i++) {
        const riv_point_three = []
        for (let j = 0; j < riverInsList[i][0].length; j++) {
            const geoPoint = [riverInsList[i][0][j].lng, riverInsList[i][0][j].lat]
            //平面
            const three_pos_x = ((geoPoint[0] - geoBoundsMinX) * demWidth) / geoWidth //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
            const three_pos_z = ((geoPoint[1] - geoBoundsMinY) * demHeight) / geoHeight //将选择框缩放至dem大小，p点位置距dem左上角y距离等比缩放
            let three_pos_x_trans = three_pos_x - demWidth / 2 //左上坐标系平移至中间点坐标系
            let three_pos_z_trans = demHeight / 2 - three_pos_z //左上坐标系平移至中间点坐标系

            //*****先判断点是否刚好在边界上,若在,需要偏移极小量,否则不能相交
            if (Math.abs(three_pos_x_trans - bboxDem.min.x) < 0.00000001) {
                three_pos_x_trans += 0.00000001;
            } else if (Math.abs(three_pos_x_trans - bboxDem.max.x) < 0.00000001) {
                three_pos_x_trans -= 0.00000001;
            } else if (Math.abs(three_pos_z_trans - bboxDem.min.z) < 0.00000001) {
                three_pos_z_trans += 0.00000001;
            } else if (Math.abs(three_pos_z_trans - bboxDem.max.z) < 0.00000001) {
                three_pos_z_trans -= 0.00000001;
            }

            //高程
            const startY = meshDem.geometry.boundingBox.max.y + 10
            const direction = new THREE.Vector3(0, -1, 0)
            const rayOrigin = new THREE.Vector3(
                three_pos_x_trans,
                startY,
                three_pos_z_trans
            )
            raycaster.set(rayOrigin, direction)
            const intersects = raycaster.intersectObjects([meshDem])
            if (intersects.length > 0) {
                const point = intersects[0].point
                const geometry = new THREE.SphereGeometry(spere_radius, 16, 16)
                const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
                const sphere = new THREE.Mesh(geometry, material)
                sphere.position.copy(point)
                rivSphereGroup.add(sphere)
                riv_point_three.push([[three_pos_x_trans, three_pos_z_trans], point])
            } else {
                //有没有交叉到的点
                console.log(bboxDem, riverInsList[i][0].length, j, three_pos_x_trans, three_pos_z_trans)
            }

        }
        const wireframeGeometry = new THREE.WireframeGeometry(meshDem.geometry)
        wireframeGeometry.applyMatrix4(meshDem.matrixWorld)
        const positionAttribute = wireframeGeometry.getAttribute('position')

        //将转为three坐标的riv_point构成lien与seg交叉判断交点
        let river_point_list = []
        for (let j = 0; j < riv_point_three.length - 1; j++) {
            river_point_list.push(riv_point_three[j][1])
            const riv_sp = riv_point_three[j][0]
            const riv_ep = riv_point_three[j + 1][0]
            const riv_line = [riv_sp, riv_ep]
            // console.log(riv_line)
            for (let k = 0; k < positionAttribute.count - 1; k += 2) {
                const start = new THREE.Vector3()
                const end = new THREE.Vector3()
                start.fromBufferAttribute(positionAttribute, k)
                end.fromBufferAttribute(positionAttribute, k + 1)
                //*****
                meshDem.localToWorld(start)
                meshDem.localToWorld(end)
                const seg_sp = [start.x, start.y]
                const seg_ep = [end.x, end.y]
                const seg_line = [seg_sp, seg_ep]
                const ins_point1 = lineSegmentsIntersect(seg_line, riv_line)

                if (ins_point1.intersects) {
                    const startY = meshDem.geometry.boundingBox.max.y + 10
                    const direction = new THREE.Vector3(0, -1, 0)
                    const rayOrigin = new THREE.Vector3(
                        ins_point1.intersectionPoint[0],
                        startY,
                        ins_point1.intersectionPoint[1]
                    )
                    raycaster.set(rayOrigin, direction)
                    const intersects = raycaster.intersectObjects([meshDem])
                    if (intersects.length > 0) {
                        const point = intersects[0].point
                        river_point_list.push(point)

                        const geometry = new THREE.SphereGeometry(spere_radius, 16, 16)
                        const material = new THREE.MeshBasicMaterial({ color: 0xff00ff })
                        const sphere = new THREE.Mesh(geometry, material)
                        sphere.position.copy(point)
                        crossSphereGroup.add(sphere)
                    }
                }
            }
        }
        river_point_list.push(riv_point_three.at(-1)[1])

        const riv_three_geo = new THREE.BufferGeometry().setFromPoints(river_point_list)
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 20 // 注意：某些浏览器可能不支持线宽
        })
        const line = new THREE.Line(riv_three_geo, material)
        rivPolylineGroup.add(line)
        scene.add(rivSphereGroup)
        scene.add(crossSphereGroup)
        scene.add(rivPolylineGroup)
    }
    return [rivSphereGroup, crossSphereGroup, rivPolylineGroup]
}

//生成河流线_动态
async function c_polyline_riv_animate(scene, meshDem, bboxDem, riverInsList, bboxGeo, material) {
    const raycaster = new THREE.Raycaster()

    deleteGroup(scene, 'riv_sphere_group')
    const rivSphereGroup = new THREE.Group()
    rivSphereGroup.name = 'riv_sphere_group'

    deleteGroup(scene, 'cross_sphere_group')
    const crossSphereGroup = new THREE.Group()
    crossSphereGroup.name = 'cross_sphere_group'

    deleteGroup(scene, 'riv_polyline_group')
    const rivPolylineGroup = new THREE.Group()
    rivPolylineGroup.name = 'riv_polyline_group'

    const geoBoundsMinX = bboxGeo.getSouthWest().getLng()
    const geoBoundsMinY = bboxGeo.getSouthWest().getLat()
    const geoBoundsMaxX = bboxGeo.getNorthEast().getLng()
    const geoBoundsMaxY = bboxGeo.getNorthEast().getLat()
    const geoWidth = geoBoundsMaxX - geoBoundsMinX
    const geoHeight = geoBoundsMaxY - geoBoundsMinY
    const demWidth = bboxDem.max.x - bboxDem.min.x
    const demHeight = bboxDem.max.z - bboxDem.min.z

    //标志点大小
    const mesh_col = meshDem.geometry.parameters.widthSegments
    const mesh_row = meshDem.geometry.parameters.heightSegments
    const spere_radius = 50 / Math.min(mesh_col / geoWidth, mesh_row / geoHeight)

    //将riv_point转为three坐标
    for (let i = 0; i < riverInsList.length; i++) {
        const riv_point_three = []
        for (let j = 0; j < riverInsList[i][0].length; j++) {
            const geoPoint = [riverInsList[i][0][j].lng, riverInsList[i][0][j].lat]
            //平面
            const three_pos_x = ((geoPoint[0] - geoBoundsMinX) * demWidth) / geoWidth //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
            const three_pos_z = ((geoPoint[1] - geoBoundsMinY) * demHeight) / geoHeight //将选择框缩放至dem大小，p点位置距dem左上角y距离等比缩放
            let three_pos_x_trans = three_pos_x - demWidth / 2 //左上坐标系平移至中间点坐标系
            let three_pos_z_trans = demHeight / 2 - three_pos_z //左上坐标系平移至中间点坐标系

            //*****先判断点是否刚好在边界上,若在,需要偏移极小量,否则不能相交
            if (Math.abs(three_pos_x_trans - bboxDem.min.x) < 0.00000001) {
                three_pos_x_trans += 0.00000001;
            } else if (Math.abs(three_pos_x_trans - bboxDem.max.x) < 0.00000001) {
                three_pos_x_trans -= 0.00000001;
            } else if (Math.abs(three_pos_z_trans - bboxDem.min.z) < 0.00000001) {
                three_pos_z_trans += 0.00000001;
            } else if (Math.abs(three_pos_z_trans - bboxDem.max.z) < 0.00000001) {
                three_pos_z_trans -= 0.00000001;
            }

            //高程
            const startY = meshDem.geometry.boundingBox.max.y + 10
            const direction = new THREE.Vector3(0, -1, 0)
            const rayOrigin = new THREE.Vector3(
                three_pos_x_trans,
                startY,
                three_pos_z_trans
            )
            raycaster.set(rayOrigin, direction)
            const intersects = raycaster.intersectObjects([meshDem])
            if (intersects.length > 0) {
                const point = intersects[0].point
                const geometry = new THREE.SphereGeometry(spere_radius, 16, 16)
                const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
                const sphere = new THREE.Mesh(geometry, material)
                sphere.position.copy(point)
                rivSphereGroup.add(sphere)
                riv_point_three.push([[three_pos_x_trans, three_pos_z_trans], point])
            } else {
                //有没有交叉到的点
                console.log(bboxDem, riverInsList[i][0].length, j, three_pos_x_trans, three_pos_z_trans)
            }

        }
        const wireframeGeometry = new THREE.WireframeGeometry(meshDem.geometry)
        wireframeGeometry.applyMatrix4(meshDem.matrixWorld)
        const positionAttribute = wireframeGeometry.getAttribute('position')

        //将转为three坐标的riv_point构成lien与seg交叉判断交点
        let river_point_list = []

        //遍历所有折点，每两个组成一段line，与网格线相交
        for (let j = 0; j < riv_point_three.length - 1; j++) {

            river_point_list.push([riv_point_three[j][1]])
            const riv_sp = riv_point_three[j][0]
            const riv_ep = riv_point_three[j + 1][0]
            const riv_line = [riv_sp, riv_ep]

            const seg_point_list = []
            for (let k = 0; k < positionAttribute.count - 1; k += 2) {
                const start = new THREE.Vector3()
                const end = new THREE.Vector3()
                start.fromBufferAttribute(positionAttribute, k)
                end.fromBufferAttribute(positionAttribute, k + 1)
                //*****
                meshDem.localToWorld(start)
                meshDem.localToWorld(end)
                const seg_sp = [start.x, start.y]
                const seg_ep = [end.x, end.y]
                const seg_line = [seg_sp, seg_ep]
                const ins_point1 = lineSegmentsIntersect(seg_line, riv_line)

                if (ins_point1.intersects) {
                    const startY = meshDem.geometry.boundingBox.max.y + 10
                    const direction = new THREE.Vector3(0, -1, 0)
                    const rayOrigin = new THREE.Vector3(
                        ins_point1.intersectionPoint[0],
                        startY,
                        ins_point1.intersectionPoint[1]
                    )
                    raycaster.set(rayOrigin, direction)
                    const intersects = raycaster.intersectObjects([meshDem])
                    if (intersects.length > 0) {
                        const point = intersects[0].point
                        //交点到第j段line起点的距离
                        const dis = point.distanceTo(riv_point_three[j][1]);
                        seg_point_list.push([point, dis])
                        const geometry = new THREE.SphereGeometry(spere_radius, 16, 16)
                        const material = new THREE.MeshBasicMaterial({ color: 0xff00ff })
                        const sphere = new THREE.Mesh(geometry, material)
                        sphere.position.copy(point)
                        crossSphereGroup.add(sphere)

                        //添加canvas注记
                        // const textSprite = createTextSprite(k, point, spere_radius);
                        // crossSphereGroup.add(textSprite);
                    }
                }
            }
            //两点构成的line与格网的交点，必须在line上，可以用距离判断其顺序
            seg_point_list.sort((a, b) => a[1] - b[1]);
            for (let k = 0; k < seg_point_list.length; k++) {
                river_point_list.push(seg_point_list[k])
            }
            // river_point_list.push([riv_point_three[j+1][1]])

        }
        river_point_list.push([riv_point_three.at(-1)[1], 10000])
        // river_point_list.sort((a, b) => a[1] - b[1]);

        const river_point_list_sorted = river_point_list.map(item => item[0])
        const riv_three_geo = new THREE.BufferGeometry().setFromPoints(river_point_list_sorted)
        setupLineProgress(riv_three_geo, river_point_list_sorted);
        const line = new THREE.Line(riv_three_geo, material)
        rivPolylineGroup.add(line)


        scene.add(rivSphereGroup)
        scene.add(crossSphereGroup)
        scene.add(rivPolylineGroup)
    }
    return [rivSphereGroup, crossSphereGroup, rivPolylineGroup]
}

function createTextSprite(text, point, spere_radius) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;

    // 绘制文字
    context.fillStyle = 'white';
    context.font = '18px';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 32, 20);

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });
    const sprite = new THREE.Sprite(material);

    // 设置位置（在球体上方）
    sprite.position.copy(point);
    sprite.position.y += spere_radius; // 在球体上方偏移

    // 调整大小
    // sprite.scale.set(2, 2, 1);

    return sprite;
}

//根据河流所有点的总长度，分别计算每个点进度值，用于更新shader中的textureCoord
function setupLineProgress(geometry, points) {
    let totalLength = 0;
    const segmentLengths = [];
    for (let i = 0; i < points.length - 1; i++) {
        const length = points[i].distanceTo(points[i + 1]);
        segmentLengths.push(length);
        totalLength += length;
    }
    // 设置每个顶点的进度值
    const lineProgress = new Float32Array(points.length);
    lineProgress[0] = 0; // 起点
    let accumulatedLength = 0;
    for (let i = 1; i < points.length; i++) {
        accumulatedLength += segmentLengths[i - 1];
        lineProgress[i] = accumulatedLength / totalLength;
        // console.log(i,accumulatedLength / totalLength)
    }

    geometry.setAttribute('lineProgress', new THREE.BufferAttribute(lineProgress, 1));
    return totalLength;
}

//更新sphere大小
function updateRiverPointSphere(rivSphereList, camera) {
    rivSphereList.traverse(s => {
        if (s.isMesh) {
            // 获取世界坐标
            const worldPosition = new THREE.Vector3();
            s.getWorldPosition(worldPosition);

            // 基于世界坐标计算距离
            const distance = worldPosition.distanceTo(camera.position);
            const scale = Math.min(4, Math.max(0.05, distance / 10));

            // 应用缩放
            s.scale.setScalar(scale);
        }
    });
}

//注册Three中元素的隐藏与显示开关
function regSHThreeFeature(showFlag, domID, groupName) {
    let bt = $('#' + domID).find('button')[0]
    bt.removeEventListener('click', HD1)
    bt.addEventListener('click', HD1)

    let circle = $('#' + domID).find('.switch_circle')[0]
    function HD1() {
        bt.classList.toggle('switch_active')
        circle.classList.toggle('circle_right')
        const group = scene1.getObjectByName(groupName);
        if (showFlag[domID] == true) {
            if (group) {
                group.traverse(s => {
                    s.visible = false
                })
            }
            showFlag[domID] = false
        } else {
            if (group) {
                group.traverse(s => {
                    s.visible = true
                })
            }
            showFlag[domID] = true
        }
    }
}

//注册TDT中元素的隐藏与显示开关
function regSHTDTFeature(showFlag, domID, ovList) {
    let bt = $('#' + domID).find('button')[0]
    let circle = $('#' + domID).find('.switch_circle')[0]

    bt.addEventListener('click', () => {
        bt.classList.toggle('switch_active')
        circle.classList.toggle('circle_right')
        if (showFlag[domID] == true) {
            ovList.forEach(ov => {
                if (ov.name == domID.split('_').at(-1)) {
                    ov.hide()
                }
            })
            showFlag[domID] = false
        } else {
            ovList.forEach(ov => {
                if (ov.name == domID.split('_').at(-1)) {
                    ov.show()
                }
            })
            showFlag[domID] = true
        }
    })

}



