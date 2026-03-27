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

//计算两点投影长度
function calculateProjectedDistance(point1, point2) {
    // 将两点转换为平面坐标
    const xy1 = LatLon2XY(point1[0], point1[1]);
    const xy2 = LatLon2XY(point2[0], point2[1]);

    // 计算平面直角坐标系中的距离
    const dx = xy2.x - xy1.x;
    const dy = xy2.y - xy1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

//判断点是否在折线上
function isPointOnPolyline(polyline_ys, point, tolerance = 0.1) {
    // 检查输入是否有效
    if (polyline_ys.length < 2 || !point || point.length !== 2) {
        return false;
    }

    const [px, py] = point;

    // 遍历所有线段
    for (let i = 0; i < polyline_ys.length - 1; i++) {
        const [x1, y1] = polyline_ys[i];
        const [x2, y2] = polyline_ys[i + 1];

        // 如果点在线段的矩形范围内
        if (px >= Math.min(x1, x2) - tolerance && px <= Math.max(x1, x2) + tolerance &&
            py >= Math.min(y1, y2) - tolerance && py <= Math.max(y1, y2) + tolerance) {

            // 如果是垂直线段
            if (Math.abs(x1 - x2) < tolerance) {
                if (Math.abs(px - x1) < tolerance) {
                    return true;
                }
            }
            // 如果是水平线段
            else if (Math.abs(y1 - y2) < tolerance) {
                if (Math.abs(py - y1) < tolerance) {
                    return true;
                }
            }
            // 斜线段
            else {
                // 计算点到线段的距离
                const slope = (y2 - y1) / (x2 - x1);
                const intercept = y1 - slope * x1;
                const expectedY = slope * px + intercept;

                if (Math.abs(py - expectedY) < tolerance) {
                    return true;
                }
            }
        }
    }

    return false;
}

//根据bounds生成四条线
function cBoundsLine(bounds) {
    const NE = bounds.currentBounds.getNorthEast()
    const SW = bounds.currentBounds.getSouthWest()
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

// 计算两条线段的交点
function calculateIntersection(line1, line2) {
    const [p1, p2] = line1;
    const [p3, p4] = line2;

    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1];
    const x3 = p3[0], y3 = p3[1];
    const x4 = p4[0], y4 = p4[1];

    // 计算分母
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // 如果分母为0，说明线段平行或重合
    if (denominator === 0) {
        return null; // 没有交点或有无穷多个交点
    }

    // 计算交点坐标
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // 检查交点是否在线段范围内
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const x = x1 + t * (x2 - x1);
        const y = y1 + t * (y2 - y1);
        return [x, y];
    }

    return null; // 交点在线段延长线上
}

// 判断两条线段是否相交并返回交点
function linesIntersectWithPoint(line1, line2) {
    const intersection = calculateIntersection(line1, line2);
    return {
        intersects: intersection !== null,
        intersectionPoint: intersection
    };
}


//高德数据转WGS84
function coord_trans_gd_wgs84(lng, lat) {
    const a = 6378245.0
    const ee = 0.00669342162296594323
    let dLat,dLng

    dLat = transformLat(lng - 105.0, lat - 35.0)
    dLng = transformLng(lng - 105.0, lat - 35.0)
    const radLat  = lat / 180.0 * Math.PI
    let magic = Math.sin(radLat)
    magic = 1 - ee * magic * magic
    const sqrtMagic = Math.sqrt(magic)
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI)
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI)
    return [lng - dLng,lat-dLat]
}

function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
}
function transformLng(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
}