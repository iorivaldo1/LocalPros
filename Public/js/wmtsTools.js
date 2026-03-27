//计算点击点坐标
function calculatePixelInTileCorrected(lon, lat, zoom, tileMatrixSet) {
    const tileSize = 256;
    // 1. 将经纬度转换为Web墨卡托坐标
    function lon2mercX(lon) {
        return lon * 20037508.34 / 180;
    }
    function lat2mercY(lat) {
        const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
        return y * 20037508.34 / 180;
    }
    const mercX = lon2mercX(lon);
    const mercY = lat2mercY(lat);
    // 2. 计算初始参数
    const earthCircumference = 2 * Math.PI * 6378137;
    const initialResolution = earthCircumference / tileSize;
    const originShift = earthCircumference / 2;
    const resolution = initialResolution / Math.pow(2, zoom);
    // 3. 计算像素坐标（全局像素坐标系，原点在左上角）
    const pixelX = (mercX + originShift) / resolution;
    const pixelY = (originShift - mercY) / resolution; // 关键修正：Y轴翻转
    // 4. 计算瓦片坐标
    const tileX = Math.floor(pixelX / tileSize);
    const tileY = Math.floor(pixelY / tileSize);
    // 5. 计算瓦片内的像素坐标（I, J）
    const i = Math.floor(pixelX % tileSize); // X方向正常
    const j = Math.floor(tileSize - (pixelY % tileSize) - 1); // 关键修正：Y方向翻转

    return {
        tileX: tileX,
        tileY: tileY,
        i: i,
        j: j,
        globalPixelX: pixelX,
        globalPixelY: pixelY,
        pixelInTileX: pixelX % tileSize,
        pixelInTileY: pixelY % tileSize
    };
}

//等分切割线,返回nps和平距数据
function getPLByDividePL(polyline, divCount) {
    var points = []
    
    for (let i = 0; i < polyline.length - 1; i++) {
        var diff_x = polyline[i + 1][0] - polyline[i][0]
        var diff_y = polyline[i + 1][1] - polyline[i][1]
        var d_x = diff_x / divCount;
        var d_y = diff_y / divCount;


        for (let j = 0; j < divCount; j++) {
            var np_x = polyline[i][0] + j * d_x
            var np_y = polyline[i][1] + j * d_y
            points.push([np_x, np_y])
        }
    }
    return points
}

//设置switch开关监听--查询坐标开关
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

//高斯正投公式
function LatLon2XY(longitude, latitude) {
    // 椭球参数
    const a = 6378137.0;
    const e2 = 0.0066943802013;

    // 角度转弧度
    const latitude2Rad = (Math.PI / 180.0) * latitude;

    // 计算3度带带号和中央经线
    const beltNo = Math.floor((longitude + 1.5) / 3.0);
    const L = beltNo * 3;
    const l0 = longitude - L; // 经差

    // 辅助计算
    const tsin = Math.sin(latitude2Rad);
    const tcos = Math.cos(latitude2Rad);
    const t = Math.tan(latitude2Rad);
    const m = (Math.PI / 180.0) * l0 * tcos;
    const et2 = e2 * Math.pow(tcos, 2);
    const et3 = e2 * Math.pow(tsin, 2);

    // 子午线弧长X
    const X = 111132.9558 * latitude - 16038.64984 * Math.sin(2 * latitude2Rad) +
        16.8610 * Math.sin(4 * latitude2Rad) - 0.024033 * Math.sin(6 * latitude2Rad);

    // 卯酉圈曲率半径
    const N = a / Math.sqrt(1 - et3);

    // 计算平面坐标
    const x = X + N * t * (
        0.5 * Math.pow(m, 2) +
        (5.0 - Math.pow(t, 2) + 9.0 * et2 + 4 * Math.pow(et2, 2)) * Math.pow(m, 4) / 24.0 +
        (61.0 - 58.0 * Math.pow(t, 2) + Math.pow(t, 4)) * Math.pow(m, 6) / 720.0
    );

    const y = 500000 + N * (
        m +
        (1.0 - Math.pow(t, 2) + et2) * Math.pow(m, 3) / 6.0 +
        (5.0 - 18.0 * Math.pow(t, 2) + Math.pow(t, 4) + 14.0 * et2 - 58.0 * et2 * Math.pow(t, 2)) * Math.pow(m, 5) / 120.0
    );

    return {
        x: x,
        y: y
    };
}

//计算线段分段长度
function calculateProjectedDistance(point1, point2) {
    // 将两点转换为平面坐标
    const xy1 = LatLon2XY(point1[0], point1[1]);
    const xy2 = LatLon2XY(point2[0], point2[1]);

    // 计算平面直角坐标系中的距离
    const dx = xy2.x - xy1.x;
    const dy = xy2.y - xy1.y;
    return Math.sqrt(dx * dx + dy * dy);
}