//工具函数-----------------
//TDT中显示坐标
function regShowCoord(map) {
    var flag = 0;
    let bt = $(".switch")[0];
    let circl = $(".switch_circle")[0];
    bt.addEventListener("click", () => {
        bt.classList.toggle("switch_active");
        circl.classList.toggle("circle_right");
        circl.classList.toggle("circle_left");
        if (flag == 0) {
            removeMapMousemove(map);
            $("#coordInfoContainer").show()
            $("#coord").css("padding", "10px")
            map.addEventListener("mousemove", MapMousemove);
            flag = 1
        } else {
            map.removeEventListener("mousemove", MapMousemove);
            $("#coordInfoContainer").hide()
            $("#coord").css("padding", "0px")
            flag = 0
        }
    });
    function removeMapMousemove(map) {
        map.removeEventListener("mousemove", MapMousemove);
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
    const x = (lng + 180) / 360;
    const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) +
        1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2;
    const tileCount = Math.pow(2, zoom);
    const tileCol = Math.floor(x * tileCount);
    const tileRow = Math.floor(y * tileCount);

    return [tileCol, tileRow];
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
        '&TILECOL=' + tileCol +
        '&TILEROW=' + tileRow +
        '&TILEMATRIX=' + zoom

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
        '&TILECOL=' + tileCol +
        '&TILEROW=' + tileRow +
        '&TILEMATRIX=' + zoom

    return wmtsUrl

}

//计算瓦片行列号边界
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

//根据行列号计算坐标
function tileToLngLat(tileCol, tileRow, zoom) {
    const n = Math.pow(2, zoom);
    const lng = tileCol / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileRow / n)));
    const lat = latRad * 180 / Math.PI;

    return [lng, lat];
}

//查找mesh
function getMeshByName(m_scene, m_name) {
    let targetMesh = null;
    m_scene.traverse(function (object) {
        if (object.isMesh && object.name === m_name) {
            targetMesh = object;
        }
    });
    return targetMesh;
}

//根据bounds生成四条线
function c_bbox_line(bbox) {
    const NE = bbox.getNorthEast()
    const SW = bbox.getSouthWest()
    const minX = SW.lng
    const minY = SW.lat
    const maxX = NE.lng
    const maxY = NE.lat
    const edge_left = [[minX, minY], [minX, maxY]]
    const edge_top = [[minX, maxY], [maxX, maxY]]
    const edge_right = [[maxX, maxY], [maxX, minY]]
    const edge_bottom = [[maxX, minY], [minX, minY]]

    return [edge_left, edge_top, edge_right, edge_bottom]
}

//工具函数-----------------

//测试用--加入yaBridge
function test_add_ya_bridge_point(bridge_list) {
    var qlIconUrl = "/Public/imgs/bridge.png";
    var icon = new T.Icon({
        iconUrl: qlIconUrl, //请求图标图片的URL
        iconSize: new T.Point(15, 15), //图标可视区域的大小。
        iconAnchor: new T.Point(7.5, 7.5), //图标的定位锚点
    });
    $.get('http://localhost:8080/localGEO/getYABridge').then(res => {
        res.forEach(b => {
            const b_jd = parseFloat(b.geometry.split(' ')[0].split('(')[1]).toFixed(5)
            const b_wd = parseFloat(b.geometry.split(' ')[1].replace(')', '')).toFixed(5)
            bridge_list.push([b_jd, b_wd, b.bridgeName])
            var bridge_pos_tdt = new T.LngLat(b_jd, b_wd);
            var marker = new T.Marker(bridge_pos_tdt, {
                icon: icon,
            });
            map.addOverLay(marker);
        })
    })
}

//设置数据Bbox(line)
async function setSourceBounds(url, layerName) {
    const response = await fetch(url);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    // 解析所有图层
    let layerInfo;
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
//创建全局scene和camera
function createScene(domID, camera) {
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
    const container = domID
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container[0].clientWidth, container[0].clientHeight);
    container[0].appendChild(renderer.domElement);
    scene.add(ambientLight);
    scene.add(directionalLight);
    const control = new THREE.OrbitControls(camera, renderer.domElement);
    control.enablePan = true;
    control.panSpeed = 1.0; // 调整平移速度
    control.keyPanSpeed = 20.0;

    return [scene, control, renderer]
}

//recTool.draw->bbox
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
async function setDEMUrl_ys(layerName, bbox) {
    const minX = bbox.getSouthWest().lng;
    const minY = bbox.getSouthWest().lat;
    const maxX = bbox.getNorthEast().lng;
    const maxY = bbox.getNorthEast().lat;

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




//本地dem地址--边界扩展
async function setDEMUrl(layerName, bbox) {
    const resolution = 0.00027777778
    const minX = bbox.getSouthWest().lng;
    const minY = bbox.getSouthWest().lat;
    const maxX = bbox.getNorthEast().lng;
    const maxY = bbox.getNorthEast().lat

    let wcsURL = 'http://localhost:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' + layerName +
        '&format=image/tiff' +
        '&subset=Long(' + minX + ',' + maxX + ')' +
        '&subset=Lat(' + minY + ',' + maxY + ')'

    const demData = await fetch(wcsURL)
    const arrayBuffer = await demData.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const dem_range = image.getBoundingBox();

    let [dem_minX, dem_minY, dem_maxX, dem_maxY] = dem_range
    if (minX < dem_minX) {
        dem_minX = dem_minX - resolution
    }

    if (minY < dem_minY) {
        dem_minY = dem_minY - resolution
    }

    if (maxX > dem_maxX) {
        dem_maxX = dem_maxX + resolution
    }

    if (maxY > dem_maxY) {
        dem_maxY = dem_maxY + resolution
    }

    wcsURL = 'http://localhost:8080/geoserver/wcs' +
        '?service=WCS' +
        '&version=2.0.1' +
        '&request=GetCoverage' +
        '&coverageId=' + layerName +
        '&format=image/tiff' +
        '&subset=Long(' + dem_minX + ',' + dem_maxX + ')' +
        '&subset=Lat(' + dem_minY + ',' + dem_maxY + ')'

    return [wcsURL, [dem_minX, dem_minY, dem_maxX, dem_maxY]]
}

//生成mesh_dem
async function c_mesh_dem(demData, camera, m_meshname,) {
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

//生成mesh_compass
async function c_mesh_compass(bbox_dem, mesh_name) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.FontLoader();
        loader.load('/Public/fonts/helvetiker_regular.typeface.json', function (font) {
            const textGeometry = new THREE.TextGeometry('N', {
                font: font,
                size: 0.2,
                height: 0.03,
                curveSegments: 1,
                bevelEnabled: false,
            });
            // const textMaterial = new THREE.MeshPhongMaterial({ color: 0x049ef4 });
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0x049ef4 });//不受光照影响
            const mesh_n_arrow = new THREE.Mesh(textGeometry, textMaterial);
            mesh_n_arrow.name = mesh_name;
            textGeometry.computeBoundingBox();

            const text_pos = new THREE.Vector3(0, bbox_dem.max.y, bbox_dem.min.z);
            mesh_n_arrow.position.copy(text_pos);

            resolve(mesh_n_arrow);
        }, undefined, reject);
    });
}

//生成bridge_point_list
async function c_point_bridge(demData, bbox_dem, pointList, bbox_geo) {
    const pointGeoList = []
    //读取dem数据
    const tiff = await GeoTIFF.fromArrayBuffer(demData);
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
        if (bbox_geo.contains(p_pos_tdt)) {
            inBboxPointList.push([p[0], p[1], p[2]])
        }
    })

    //tdt中选择框相关参数
    const dragBoxMinX = bbox_geo.getSouthWest().getLng()
    const dragBoxMinY = bbox_geo.getSouthWest().getLat()
    const dragBoxMaxX = bbox_geo.getNorthEast().getLng()
    const dragBoxMaxY = bbox_geo.getNorthEast().getLat()

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

//生成标注_使用精灵方式(通过canvas生成，不受scene光照、视角影响)
function c_label_bridge(pointGeo, fontSize) {
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

//多层(img + cia)Tile_裁切
async function c_dom_img_cia(bbox) {
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

//new Image().onLoad-批量
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

//new Image().onload-获取地址的数据----fetch(url)
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

//加载纹理
async function loadTexture(mesh, texture) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        texture.toDataURL('image/png'),
        function (texture) {
            mesh.material.map = texture
            mesh.material.side = THREE.DoubleSide
            mesh.material.needsUpdate = true
        }
    )
}

//根据camera距离更新bridge_point的大小
function updateSphereSizes(pointGeoList, camera) {
    pointGeoList.forEach(sphere => {
        const distance = sphere[0].position.distanceTo(camera.position);
        //距离过大时限制为2,距离过滤时限制为0.1
        const scale = Math.min(4, Math.max(0.05, distance / 10))
        sphere[0].scale.setScalar(scale);
    });
}

function updateSphereSize(pointGeo, camera) {
    const distance = pointGeo.position.distanceTo(camera.position);
    const scale = Math.min(4, Math.max(0.05, distance / 10))
    pointGeo.scale.setScalar(scale);
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
        mesh.geometry.dispose();
        mesh.material.dispose();
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
                    const target = event.target;
                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';
                    // 同步更新 Scene
                    updateSceneSize(event.rect.width - 10, event.rect.height - 40);
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
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            }
        });
}

//根据dom动态调整scene
function updateSceneSize(width, height) {
    renderer1.setSize(width, height);
    camera1.aspect = width / height;
    camera1.updateProjectionMatrix();
    renderer1.render(scene1, camera1);
    $('#threeCon1').css('width', width);
    $('#threeCon1').css('height', height);
}

//注册交互点击
function initClick(drawRect, tdtMap, scene, render, camera, demMesh, bboxGeo) {
    const bbox_dem = new THREE.Box3().setFromObject(demMesh);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let dem_marker;
    let geo_marker;

    $('#threeCon1').on('mouseenter', function () {
        let mouseDownTime = 0;
        $(this).off('mousedown mouseup');
        $(this).on('mousedown', function () {
            mouseDownTime = Date.now();
        });

        $(this).on('mouseup', function (mouseUpEvent) {
            const mouseUpTime = Date.now();
            const timeInterval = mouseUpTime - mouseDownTime;
            if (timeInterval < 200) {
                ThreeClickHD(mouseUpEvent, tdtMap, render, camera, demMesh);
            }
            mouseDownTime = 0;
        });
    });

    $('#threeCon1').on('mouseleave', function () {
        $(this).off('mousedown mouseup');
        $(document).off('mousemove.dragCheck');
    });


    //3D窗口点击事件
    function ThreeClickHD(event, tdtMap, render, camera, mesh) {
        const canvas = render.domElement
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        mouse.x = (x / canvas.clientWidth) * 2 - 1;
        mouse.y = - (y / canvas.clientHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects([mesh]);

        //计算dem_mesh宽高
        const bbox = new THREE.Box3().setFromObject(mesh);
        const dem_width = bbox.max.x - bbox.min.x
        const dem_height = bbox.max.z - bbox.min.z

        //计算geo宽高
        const minX = geo_bbox.getSouthWest().lng
        const minY = geo_bbox.getSouthWest().lat
        const maxX = geo_bbox.getNorthEast().lng
        const maxY = geo_bbox.getNorthEast().lat
        const geo_width = maxX - minX;
        const geo_height = maxY - minY;

        const scale = Math.min(dem_width / geo_width, dem_height / geo_height)

        if (intersects.length > 0) {
            const point = intersects[0].point;
            if (!dem_marker) {
                const markerGeometry = new THREE.SphereGeometry(scale * 0.0002, 16, 16);
                const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

                dem_marker = new THREE.Mesh(markerGeometry, markerMaterial);
                dem_marker.position.copy(point);
                scene.add(dem_marker); ``
                dem_marker_list.push(dem_marker)
            } else {
                dem_marker.position.copy(point)
            }
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
                tdtMap.addOverLay(geo_marker)
                geo_marker_list.push(geo_marker)
            } else {
                geo_marker.setCenter(new T.LngLat(p_x_geo, p_y_geo))
            }

        }
    }

    drawRect.addEventListener('mouseover', function () {
        drawRect.removeEventListener('click')
        drawRect.addEventListener('click', (e) => TDTClickHD(e, tdtMap, bbox_dem, bboxGeo, demMesh))
    })

    drawRect.addEventListener('mouseout', function () {
        drawRect.removeEventListener('click')
    })

    //天地图矩形内点击事件
    async function TDTClickHD(e, tdtMap, bboxDem, bboxGeo, meshDem) {
        //map中添加点
        const jd = e.lnglat.lng
        const wd = e.lnglat.lat
        if (!geo_marker) {
            geo_marker = new T.Circle(
                new T.LngLat(jd, wd),
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
            tdtMap.addOverLay(geo_marker)
            geo_marker_list.push(geo_marker)
        } else {
            geo_marker.setCenter(new T.LngLat(jd, wd))
        }

        c_point_tdt_click_point_ins([jd, wd], bboxDem, bboxGeo, meshDem)
    }

    //射线交叉计算y值
    function c_point_tdt_click_point_ins(point, bbox_dem, bbox_geo, meshDem) {
        //1.计算x和z值
        const dragBoxMinX = bbox_geo.getSouthWest().getLng()
        const dragBoxMinY = bbox_geo.getSouthWest().getLat()
        const dragBoxMaxX = bbox_geo.getNorthEast().getLng()
        const dragBoxMaxY = bbox_geo.getNorthEast().getLat()
        const geo_width = dragBoxMaxX - dragBoxMinX
        const geo_height = dragBoxMaxY - dragBoxMinY
        const dem_width = bbox_dem.max.x - bbox_dem.min.x
        const dem_height = bbox_dem.max.z - bbox_dem.min.z

        //---------------以左下角为原坐标系的原点---------------/
        //x方向 ：以左边为参考点
        const three_pos_x = (point[0] - dragBoxMinX) * dem_width / geo_width //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
        const three_pos_x_trans = three_pos_x - (dem_width / 2) //左上坐标系平移至中间点坐标系
        //y方向：以下边为参考点
        const three_pos_z = (point[1] - dragBoxMinY) * dem_height / geo_height
        const three_pos_z_trans = (dem_height / 2) - three_pos_z //左下坐标系平移至中间点坐标系

        //---------------以左上角为原坐标系的原点---------------/
        //y方向：以上边为参考点
        // const three_pos_z = (dragBoxMaxY - point[1]) * dem_height / geo_height
        // const three_pos_z_trans = three_pos_z -  (dem_height / 2)  
        //2.计算y值
        const startY = meshDem.geometry.boundingBox.max.y + 10;
        const direction = new THREE.Vector3(0, -1, 0);
        const rayOrigin = new THREE.Vector3(three_pos_x_trans, startY, three_pos_z_trans);
        raycaster.set(rayOrigin, direction);
        const intersects = raycaster.intersectObjects([meshDem]);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            if (!dem_marker) {
                const scale = Math.min(dem_width / geo_width, dem_height / geo_height)
                const geometry = new THREE.SphereGeometry(scale * 0.0002, 16, 16);
                // const colCount = meshDem.geometry.parameters.widthSegments

                const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                dem_marker = new THREE.Mesh(geometry, material);
                dem_marker.position.copy(point)
                scene.add(dem_marker)
                dem_marker_list.push(dem_marker)
            } else {
                dem_marker.position.copy(point)
            }
        }
    }
}

function cal_riv_intersects(rivList, bboxGeo) {
    const riv_ins = []
    rivList.forEach(river => {
        if (bboxGeo.intersects(river[0].getBounds())) {
            const riv_coords = river[0].getLngLats()
            const point_in_bbox_list = []
            //p_index纪录在bounds内的第一个点和最后一个点
            const p_index = []
            for (let i = 0; i < riv_coords.length; i++) {
                if (bboxGeo.contains(riv_coords[i])) {
                    point_in_bbox_list.push(riv_coords[i])
                    p_index.push(i)
                }
            }

            if (p_index.length > 0) {
                if (p_index.at(-1) == riv_coords.length - 1) {
                    //只有一个交点
                    const ins_riv_line1 = [
                        [riv_coords[p_index[0] - 1].lng, riv_coords[p_index[0] - 1].lat],
                        [riv_coords[p_index[0]].lng, riv_coords[p_index[0]].lat]
                    ]
                    const ins_bounds_lines = c_bbox_line(bboxGeo)
                    ins_bounds_lines.forEach(l => {
                        //第一点和再前一个点组成第一条线
                        const ins_point1 = linesIntersectWithPoint(ins_riv_line1, l)
                        if (ins_point1.intersects) {
                            const p_lnglat = new T.LngLat(ins_point1.intersectionPoint[0], ins_point1.intersectionPoint[1])
                            //插入列表第一个点之前
                            point_in_bbox_list.unshift(p_lnglat)
                        }
                    })
                    riv_ins.push([point_in_bbox_list, river[1]])
                } else if (p_index.length - 1 !== (p_index.at(-1) - p_index[0])) {
                    //反复穿插
                    //1.计算入或出时，在bounds内的最近的点的index
                    let near_bounds_point_index = []
                    near_bounds_point_index.push(p_index[0])
                    for (let i = 0; i < p_index.length - 1; i++) {
                        if (p_index[i + 1] - p_index[i] != 1) {
                            near_bounds_point_index.push(p_index[i])
                            near_bounds_point_index.push(p_index[i + 1])
                        }
                    }
                    near_bounds_point_index.push(p_index.at(-1))
                    //2.生成最临近边界处的交叉线
                    const cross_line_list = []
                    for (let i = 0; i < near_bounds_point_index.length; i++) {
                        if (i % 2 == 0) {
                            const seg1_sp = [riv_coords[near_bounds_point_index[i] - 1].lng, riv_coords[near_bounds_point_index[i] - 1].lat]
                            const seg1_ep = [riv_coords[near_bounds_point_index[i]].lng, riv_coords[near_bounds_point_index[i]].lat]
                            cross_line_list.push([seg1_sp, seg1_ep])
                        } else {
                            const seg2_sp = [riv_coords[near_bounds_point_index[i]].lng, riv_coords[near_bounds_point_index[i]].lat]
                            const seg2_ep = [riv_coords[near_bounds_point_index[i] + 1].lng, riv_coords[near_bounds_point_index[i] + 1].lat]
                            cross_line_list.push([seg2_sp, seg2_ep])
                        }
                    }
                    //3.计算边界四边与交叉线的交点
                    const cross_point_list = []
                    const ins_bounds_lines = c_bbox_line(bboxGeo)
                    for (let i = 0; i < cross_line_list.length; i++) {
                        const ins_bounds_lines = c_bbox_line(bboxGeo)
                        ins_bounds_lines.forEach(l => {
                            const ins_point1 = linesIntersectWithPoint(cross_line_list[i], l)
                            if (ins_point1.intersects) {
                                cross_point_list.push(ins_point1.intersectionPoint)
                                var circle = new T.Circle(
                                    new T.LngLat(
                                        ins_point1.intersectionPoint[0],
                                        ins_point1.intersectionPoint[1]
                                    ), 5);

                                map.addOverLay(circle)
                                geo_marker_list.push(circle)
                            }
                        })
                    }
                    //cross_point_list去重
                    // const cross_point_list_unique = [...new Set(cross_point_list.map(JSON.stringify))].map(JSON.parse);
                    //4.将point_in_bbox_list切分
                    let slice_start_index = 0
                    for (let i = 0; i < near_bounds_point_index.length / 2; i++) {
                        const slice_len = near_bounds_point_index[i * 2 + 1] - near_bounds_point_index[i * 2] + 1
                        const slice = point_in_bbox_list.slice(slice_start_index, slice_start_index + slice_len);
                        slice_start_index = slice_start_index + slice_len;  // 累加起始位置
                        slice.unshift(new T.LngLat(cross_point_list[i * 2][0], cross_point_list[i * 2][1]))
                        slice.push(new T.LngLat(cross_point_list[i * 2 + 1][0], cross_point_list[i * 2 + 1][1]))
                        riv_ins.push([slice, river[1]])
                        var line = new T.Polyline(slice, {
                            color: 'blue',
                            weight: 3,
                            opacity: 0.8,
                            lineStyle: "dashed",
                        });
                        map.addOverLay(line);
                        geo_marker_list.push(line)
                    }
                } else {
                    //p_index[0]第一个在bounds内的点,p_index[0]-1向前一个点
                    const ins_riv_line1 = [
                        [riv_coords[p_index[0] - 1].lng, riv_coords[p_index[0] - 1].lat],
                        [riv_coords[p_index[0]].lng, riv_coords[p_index[0]].lat]
                    ]
                    //p_index.at(-1)最后一个在bounds内的点
                    const ins_riv_line2 = [
                        [riv_coords[p_index.at(-1)].lng, riv_coords[p_index.at(-1)].lat],
                        [riv_coords[p_index.at(-1) + 1].lng, riv_coords[p_index.at(-1) + 1].lat]
                    ]
                    //根据bounds生成四条边线
                    const ins_bounds_lines = c_bbox_line(bboxGeo)
                    //遍历四条边线与生成的两条线进行交叉检查
                    ins_bounds_lines.forEach(l => {
                        //第一点和再前一个点组成第一条线
                        const ins_point1 = linesIntersectWithPoint(ins_riv_line1, l)

                        if (ins_point1.intersects) {
                            const p_lnglat = new T.LngLat(ins_point1.intersectionPoint[0], ins_point1.intersectionPoint[1])
                            //插入列表第一个点之前
                            point_in_bbox_list.unshift(p_lnglat)
                        }

                        //最后一个点和再往后一个点组成第二条线
                        const ins_point2 = linesIntersectWithPoint(ins_riv_line2, l)
                        if (ins_point2.intersects) {
                            //放入列表最后
                            const p_lnglat = new T.LngLat(ins_point2.intersectionPoint[0], ins_point2.intersectionPoint[1])
                            point_in_bbox_list.push(p_lnglat)
                        }
                    })
                    riv_ins.push([point_in_bbox_list, river[1]])
                }
            }
        }
    })
    riv_ins.forEach(riv => {
        var line = new T.Polyline(riv[0], {
            color: 'blue',
            weight: 3,
            opacity: 0.8,
            lineStyle: "dashed",
        });
        map.addOverLay(line);
        geo_marker_list.push(line)
    })

    return riv_ins
}

//创建河流
async function c_polyline_river(demData, bboxDem, riverInsList, bboxGeo) {
    //读取dem数据
    const tiff = await GeoTIFF.fromArrayBuffer(demData);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    //width和height理解为x和y方向有多少个像元
    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();

    //tdt中选择框相关参数
    const dragBoxMinX = bboxGeo.getSouthWest().getLng()
    const dragBoxMinY = bboxGeo.getSouthWest().getLat()
    const dragBoxMaxX = bboxGeo.getNorthEast().getLng()
    const dragBoxMaxY = bboxGeo.getNorthEast().getLat()

    const geo_width = dragBoxMaxX - dragBoxMinX
    const geo_height = dragBoxMaxY - dragBoxMinY

    //计算左上角地理坐标
    const geoX = bbox[0]
    const geoY = bbox[3]
    //计算像元大小
    const pixelSizeX = (bbox[2] - bbox[0]) / width; //每一个像素占多少经度
    const pixelSizeY = (bbox[3] - bbox[1]) / height;//每一个像素占多少纬度
    const dem_width = bboxDem.max.x - bboxDem.min.x
    const dem_height = bboxDem.max.z - bboxDem.min.z
    const scale = Math.min(dem_width / geo_width, dem_height / geo_height)

    const riverLineList = []
    for (let i = 0; i < riverInsList.length; i++) {
        const riverPoints = []
        for (let j = 0; j < riverInsList[i][0].length; j++) {
            const geoPoint = [riverInsList[i][0][j].lng, riverInsList[i][0][j].lat]
            const col = Math.floor((geoPoint[0] - geoX) / pixelSizeX);//从左上角开始，第几列
            const row = Math.floor((geoY - geoPoint[1]) / pixelSizeY);//从左上角开始，第几行
            const cnIndex = row * width + col //内存位置
            const ele = rasters[0][cnIndex - 1]
            const three_pos_y_trnas = (ele - minElevation) / (maxElevation - minElevation);//归一后的Y值
            const three_pos_x = (geoPoint[0] - dragBoxMinX) * dem_width / geo_width //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
            const three_pos_z = (geoPoint[1] - dragBoxMinY) * dem_height / geo_height//将选择框缩放至dem大小，p点位置距dem左上角y距离等比缩放
            const three_pos_x_trans = three_pos_x - (dem_width / 2) //左上坐标系平移至中间点坐标系
            const three_pos_z_trans = (dem_height / 2) - three_pos_z //左上坐标系平移至中间点坐标系

            riverPoints.push(new THREE.Vector3(three_pos_x_trans, three_pos_y_trnas, three_pos_z_trans))
        }
        const riv_three_geo = new THREE.BufferGeometry().setFromPoints(riverPoints);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 20 // 注意：某些浏览器可能不支持线宽
        });
        const line = new THREE.Line(riv_three_geo, material);
        line.name = riverInsList[i][1]
        riverLineList.push(line)
    }
    return riverLineList

}


//创建河流点
async function c_point_river(demData, bboxDem, riverInsList, bboxGeo) {
    //读取dem数据
    const tiff = await GeoTIFF.fromArrayBuffer(demData);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    //width和height理解为x和y方向有多少个像元
    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();

    //tdt中选择框相关参数
    const dragBoxMinX = bboxGeo.getSouthWest().getLng()
    const dragBoxMinY = bboxGeo.getSouthWest().getLat()
    const dragBoxMaxX = bboxGeo.getNorthEast().getLng()
    const dragBoxMaxY = bboxGeo.getNorthEast().getLat()

    const geo_width = dragBoxMaxX - dragBoxMinX
    const geo_height = dragBoxMaxY - dragBoxMinY

    //计算左上角地理坐标
    const geoX = bbox[0]
    const geoY = bbox[3]
    //计算像元大小
    const pixelSizeX = (bbox[2] - bbox[0]) / width; //每一个像素占多少经度
    const pixelSizeY = (bbox[3] - bbox[1]) / height;//每一个像素占多少纬度
    const dem_width = bboxDem.max.x - bboxDem.min.x
    const dem_height = bboxDem.max.z - bboxDem.min.z
    const scale = Math.min(dem_width / geo_width, dem_height / geo_height)
    const riverLineList = []
    for (let i = 0; i < riverInsList.length; i++) {
        for (let j = 0; j < riverInsList[i][0].length; j++) {
            const geoPoint = [riverInsList[i][0][j].lng, riverInsList[i][0][j].lat]
            const col = Math.floor((geoPoint[0] - geoX) / pixelSizeX);//从左上角开始，第几列
            const row = Math.floor((geoY - geoPoint[1]) / pixelSizeY);//从左上角开始，第几行
            const cnIndex = row * width + col //内存位置
            const ele = rasters[0][cnIndex - 1]
            const three_pos_y_trnas = (ele - minElevation) / (maxElevation - minElevation);//归一后的Y值
            const three_pos_x = (geoPoint[0] - dragBoxMinX) * dem_width / geo_width //将选择框缩放至dem大小，p点位置距dem左上角x距离等比缩放
            const three_pos_z = (geoPoint[1] - dragBoxMinY) * dem_height / geo_height//将选择框缩放至dem大小，p点位置距dem左上角y距离等比缩放
            const three_pos_x_trans = three_pos_x - (dem_width / 2) //左上坐标系平移至中间点坐标系
            const three_pos_z_trans = (dem_height / 2) - three_pos_z //左上坐标系平移至中间点坐标系

            const geometry = new THREE.SphereGeometry(0.02, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0x1625d1 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.name = riverInsList[i][1] + j
            sphere.position.copy(new THREE.Vector3(three_pos_x_trans, three_pos_y_trnas, three_pos_z_trans))

            riverLineList.push(sphere)
        }
    }
    return riverLineList
}




