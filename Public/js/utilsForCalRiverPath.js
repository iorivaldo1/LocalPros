//求投影点
function getProjectionPointWithIndex(point, polyline) {
    function project(A, B, P) {
        const ax = A[0], ay = A[1];
        const bx = B[0], by = B[1];
        const px = P[0], py = P[1];

        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;

        const abLengthSq = abx * abx + aby * aby;
        if (abLengthSq === 0) return [ax, ay];

        const t = (apx * abx + apy * aby) / abLengthSq;
        if (t <= 0) return [ax, ay];
        if (t >= 1) return [bx, by];
        return [ax + t * abx, ay + t * aby];
    }

    function distanceSq(p1, p2) {
        const dx = p1[0] - p2[0], dy = p1[1] - p2[1];
        return dx * dx + dy * dy;
    }

    let closest = {
        projection: null,
        index: -1,
        distanceSq: Infinity
    };

    for (let i = 0; i < polyline.length - 1; i++) {
        const proj = project(polyline[i], polyline[i + 1], point);
        const distSq = distanceSq(proj, point);

        if (distSq < closest.distanceSq) {
            closest = {
                projection: proj,
                index: i,
                distanceSq: distSq
            };
        }
    }

    return closest;
}

/**
 * 高斯投影转换：经纬度转平面坐标
 * @param {number} latitude - 纬度(度)
 * @param {number} longitude - 经度(度)
 * @returns {Object} 投影坐标 {x, y}
 */
function LatLon2XY(longitude, latitude) {
    // 椭球参数
    const a = 6378137.0;
    const e2 = 0.0066943998013;

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
    const X = 111132.9558 * latitude - 16038.6496 * Math.sin(2 * latitude2Rad) +
        16.8610 * Math.sin(4 * latitude2Rad) - 0.022333 * Math.sin(6 * latitude2Rad);

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

/**
 * 计算两点之间的投影平面距离
 * @param {Object} point1 - 第一个点 {latitude, longitude}
 * @param {Object} point2 - 第二个点 {latitude, longitude}
 * @returns {number} 两点间的平面距离(米)
 */
function calculateProjectedDistance(point1, point2) {
    // 将两点转换为平面坐标
    const xy1 = LatLon2XY(point1[0], point1[1]);
    const xy2 = LatLon2XY(point2[0], point2[1]);

    // 计算平面直角坐标系中的距离
    const dx = xy2.x - xy1.x;
    const dy = xy2.y - xy1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算折线的总投影长度
 * @param {Array} polyline - 折线点数组，格式为 [{latitude, longitude}, ...]
 * @returns {number} 折线的总长度(米)
 */
function calculatePolylineLength(polyline) {
    if (polyline.length < 2) return 0;

    let totalLength = 0;

    for (let i = 1; i < polyline.length; i++) {
        const segmentLength = calculateProjectedDistance(polyline[i - 1], polyline[i]);
        totalLength += segmentLength;
    }

    return totalLength;
}


//---------------------------------------

/**
 * 计算折线在面内的部分（保留中间点）
 * @param {Array} polyline 折线点数组 [[x1,y1], [x2,y2], ...]
 * @param {Array} polygon 多边形顶点数组 [[x1,y1], [x2,y2], ...]
 * @returns {Array} 返回在面内的折线段数组（包含中间点）
 */
function clipPolylineWithMidPoints(polyline, polygon) {
    const polylineList = [];
    if (!polyline || polyline.length < 2) return polylineList;
    
    // 判断点是否在多边形内
    function isPointInPolygon(point, polygon) {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    
    // 计算线段与多边形的交点（返回交点及在折线中的位置信息）
    function getIntersectionInfo(polyline, polygon) {
        const intersections = [];
        
        for (let i = 0; i < polyline.length - 1; i++) {
            const p1 = polyline[i];
            const p2 = polyline[i + 1];
            
            for (let j = 0, k = polygon.length - 1; j < polygon.length; k = j++) {
                const p3 = polygon[j];
                const p4 = polygon[k];
                
                const denom = (p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]);
                if (denom === 0) continue;
                
                const ua = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / denom;
                const ub = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / denom;
                
                if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                    const x = p1[0] + ua * (p2[0] - p1[0]);
                    const y = p1[1] + ua * (p2[1] - p1[1]);
                    intersections.push({
                        point: [x, y],
                        segmentIndex: i,  // 交点所在的线段索引
                        t: ua             // 在线段中的位置比例
                    });
                }
            }
        }
        
        // 按在折线中出现顺序排序交点
        intersections.sort((a, b) => {
            if (a.segmentIndex !== b.segmentIndex) {
                return a.segmentIndex - b.segmentIndex;
            }
            return a.t - b.t;
        });
        
        return intersections;
    }
    
    const isStartInside = isPointInPolygon(polyline[0], polygon);
    const isEndInside = isPointInPolygon(polyline[polyline.length - 1], polygon);
    const intersections = getIntersectionInfo(polyline, polygon);
    
    // 情况1：没有交点
    if (intersections.length === 0) {
        if (isStartInside && isEndInside) {
            polylineList.push([...polyline]);
        }
        return polylineList;
    }
    
    // 收集所有交点位置
    const intersectionPoints = intersections.map(item => item.point);
    const intersectionIndices = intersections.map(item => item.segmentIndex);
    const intersectionTs = intersections.map(item => item.t);
    
    // 情况2：奇数个交点
    if (intersections.length % 2 === 1) {
        if (isStartInside) {
            // 起点在面内
            let currentSegment = [polyline[0]];
            let lastIndex = 0;
            
            for (let i = 0; i < intersections.length; i++) {
                const segIdx = intersectionIndices[i];
                
                // 添加起点到交点之间的所有点
                for (let j = lastIndex; j <= segIdx; j++) {
                    if (j === segIdx) {
                        // 当前线段，只添加交点前的部分点
                        currentSegment.push(intersectionPoints[i]);
                    } else {
                        currentSegment.push(polyline[j + 1]);
                    }
                }
                
                if (i % 2 === 0) {
                    polylineList.push(currentSegment);
                    currentSegment = [intersectionPoints[i]];
                }
                lastIndex = segIdx + 1;
            }
        } else if (isEndInside) {
            // 终点在面内
            let currentSegment = [intersectionPoints[0]];
            let lastIndex = intersectionIndices[0] + 1;
            
            for (let i = 1; i < intersections.length; i++) {
                const segIdx = intersectionIndices[i];
                
                // 添加交点之间的所有点
                for (let j = lastIndex; j <= segIdx; j++) {
                    if (j === segIdx) {
                        currentSegment.push(intersectionPoints[i]);
                    } else {
                        currentSegment.push(polyline[j]);
                    }
                }
                
                if (i % 2 === 1) {
                    polylineList.push(currentSegment);
                    currentSegment = [intersectionPoints[i]];
                }
                lastIndex = segIdx + 1;
            }
            
            // 添加最后一个交点到终点的所有点
            currentSegment = currentSegment.concat(polyline.slice(lastIndex));
            polylineList.push(currentSegment);
        }
    } 
    // 情况3：偶数个交点
    else {
        if (isStartInside && isEndInside) {
            // 起终点都在面内
            let currentSegment = [polyline[0]];
            let lastIndex = 0;
            
            for (let i = 0; i < intersections.length; i++) {
                const segIdx = intersectionIndices[i];
                
                // 添加起点到交点之间的所有点
                for (let j = lastIndex; j <= segIdx; j++) {
                    if (j === segIdx) {
                        currentSegment.push(intersectionPoints[i]);
                    } else {
                        currentSegment.push(polyline[j + 1]);
                    }
                }
                
                if (i % 2 === 0) {
                    polylineList.push(currentSegment);
                    currentSegment = [intersectionPoints[i]];
                }
                lastIndex = segIdx + 1;
            }
            
            // 添加最后一个交点到终点的所有点
            currentSegment = currentSegment.concat(polyline.slice(lastIndex));
            polylineList.push(currentSegment);
        } else {
            // 起终点都在面外
            let lastIndex = intersectionIndices[0] + 1;
            
            for (let i = 0; i < intersections.length; i += 2) {
                const startSegIdx = intersectionIndices[i];
                const endSegIdx = intersectionIndices[i + 1];
                const currentSegment = [intersectionPoints[i]];
                
                // 添加两个交点之间的所有点
                for (let j = lastIndex; j <= endSegIdx; j++) {
                    if (j === endSegIdx) {
                        currentSegment.push(intersectionPoints[i + 1]);
                    } else {
                        currentSegment.push(polyline[j]);
                    }
                }
                
                polylineList.push(currentSegment);
                lastIndex = endSegIdx + 1;
            }
        }
    }
    
    return polylineList;
}


//---------------------------------------

//计算两条河交汇点
function findClosestPoints(polyline1, polyline2) {
    let minSqDist = Infinity;
    let closestPoints = {
        point1: null,
        index1: -1,
        point2: null,
        index2: -1
    };

    // 遍历第一条折线的每个点
    for (let i = 0; i < polyline1.length; i++) {
        const p1 = polyline1[i];
        // 遍历第二条折线的每个点
        for (let j = 0; j < polyline2.length; j++) {
            const p2 = polyline2[j];
            // 计算两点之间的平方距离
            const dx = p1[0] - p2[0];
            const dy = p1[1] - p2[1];
            const sqDist = dx * dx + dy * dy;

            // 如果找到更小的距离则更新结果
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                closestPoints = {
                    point1: [...p1],
                    index1: i,
                    point2: [...p2],
                    index2: j
                };
            }
        }
    }
    return closestPoints;
}

//初始化底图的riv
function initRiverPolyline() {
    $.get("/Public/data/river_tdt.json").then(function (data) {
        data.features.forEach(feature => {
            var points = []
            feature.geometry.paths[0].forEach(point => {
                points.push(new T.LngLat(point[0], point[1]))
            })
            var line = new T.Polyline(points, {
                color: "#0080ff",
                weight: 2,
                opacity: 0.3,
                lineStyle: "dashed",
            });
            map.addOverLay(line);
        })
    })
}

//初始化县界
function initCountyPolyline(){
    $.get("/Public/data/countyborder.json").then(function (data){
        data.features.forEach(feature => {
            var points = []
            feature.geometry.paths[0].forEach(point => {
                points.push(new T.LngLat(point[0], point[1]))
            })
            var line = new T.Polyline(points, {
                color: "#000000",
                weight: 3,
                opacity: 0.1,
                lineStyle: "solid",
            });
            map.addOverLay(line);
        })
    })
}
//初始时读取县面数据
function getCountyData(pgList){
    $.get("/Public/data/countyPolygon.json").then(function(data){
        data.features.forEach(feature=>{
            const countyPolygon = [feature.geometry.rings[0],feature.attributes.county]
            pgList.push(countyPolygon)
        })
    })
}


//获取河流数据
function getRiverData(riverPolylineAndNameList) {
    $.get("/Public/data/river_tdt.json").then(function (data) {
        data.features.forEach(feature => {
            const rivPolylineAndName = [feature.geometry.paths[0], feature.attributes.name, feature.attributes.level]
            riverPolylineAndNameList.push(rivPolylineAndName)
        })
    })
}



//遍历所有河流，查找离marker最近的河流
function getRiverIndex(point, rivPolyLineList) {
    // console.log(point, rivPolyLineList)
    var disProj_s = Infinity;
    var rivIndex = 0;
    rivPolyLineList.forEach((rivPolyline, index) => {
        const disProj = getProjectionPointWithIndex(point, rivPolyline[0]).distanceSq
        if (disProj < disProj_s) {
            disProj_s = disProj
            rivName = rivPolyline[1]
            rivLevel = rivPolyline[2]
            rivIndex = index
        }
    })
    return rivIndex
}

//递归求汇入口-递归至1级河流(干流)
function getAllRivCrossPoints(point, allRiver, flag) {
    var rivIndex = getRiverIndex(point, allRiver)
    var riv = allRiver[rivIndex]
    var sliceRiverInfos = getPointProOnRiv(point, riv)
    var ep = riv[0].at(-1)
    var rivLevel = riv[2]

    var rivSlicedName = sliceRiverInfos[1]
    var rivSlicedLength = sliceRiverInfos[2]
    var rivSlicedStartPoint = sliceRiverInfos[0]
    var rivSlicedLevel = sliceRiverInfos[3]
    var rivSlicedTDTPolyline = sliceRiverInfos[4]
    var rivSlicedPolyline = sliceRiverInfos[5]
    var rivSlicedEndPoint = ep
    //将河流分段信息存入数组
    infoList.push([rivSlicedName, rivSlicedLevel, rivSlicedLength, rivSlicedStartPoint, rivSlicedEndPoint, rivSlicedTDTPolyline, rivSlicedPolyline])
    var ep_riv_dis = calculatePolylineLength([point, rivSlicedStartPoint])
    if (rivLevel == 1) {
        return infoList;
    } 
    //河流终点与下一段河流距离判断
    if (ep_riv_dis > 100 && flag > 1) {
        infoList.splice(1,1) //判定后将下一段信息踢出list
        return infoList;
    }
    var rivs = []
    allRiver.forEach((river, index) => {
        if (index !== rivIndex) {
            rivs.push(river)
        }
    })
    flag += 1
    return getAllRivCrossPoints(ep, rivs, flag)
}

//获取点位在河流上的投影并标注信息
function getPointProOnRiv(point, riv) {
    var pointProjection = getProjectionPointWithIndex(point, riv[0]).projection
    var pointAloneRiverIndex = getProjectionPointWithIndex(point, riv[0]).index + 1
    var rivSliced = riv[0].slice(pointAloneRiverIndex)
    var pointListTDT = []
    var pointList = []

    pointListTDT.push(new T.LngLat(pointProjection[0], pointProjection[1]))
    rivSliced.forEach(point => {
        pointListTDT.push(new T.LngLat(point[0], point[1]))
        pointList.push([point[0], point[1]])
    })
    var rivSlicedName = riv[1]
    var rivSlicedLength = (calculatePolylineLength(pointList) / 1000.0).toFixed(2)

    var rivSlicedLevel = riv[2]
    var line = new T.Polyline(pointListTDT, {
        color: setSlicedRivColorWidth(rivSlicedLevel)[0],
        weight: setSlicedRivColorWidth(rivSlicedLevel)[1],
        opacity: 1.0,
        lineStyle: "solid",
    });
    return [pointProjection, rivSlicedName, rivSlicedLength, rivSlicedLevel, line, pointList]
}

//根据河流等级设置颜色及宽度
function setSlicedRivColorWidth(rivLevel) {
    var color;
    var width;
    switch (rivLevel) {
        case "1":
            color = "#0c74de"
            width = 7;
            break;
        case "2":
            color = "#25844b"
            width = 6;
            break;
        case "3":
            color = "#712a46"
            width = 5;
            break;
        case "4":
            color = "#b27d32"
            width = 4;
            break;
        case "5":
            color = "#f33f8d"
            width = 3;
            break;

    }
    return [color, width]
}

//添加图元
function setOverLays(infoList) {
    //起点图元
    var startPoint = infoList[0][3]
    var icon_slicedRiv_sp = new T.Icon({
        iconUrl: "/Public/imgs/path-start.png",
        iconSize: new T.Point(80, 80),
        iconAnchor: new T.Point(40, 60)
    });
    var markerS = new T.Marker(new T.LngLat(startPoint[0], startPoint[1]), { icon: icon_slicedRiv_sp });
    map.addOverLay(markerS);
    overLayList.push(markerS)

    //终点图元
    var endPoint = infoList.at(-1)[4]
    var icon_slicedRiv_ep = new T.Icon({
        iconUrl: "/Public/imgs/path-end.png",
        iconSize: new T.Point(80, 80),
        iconAnchor: new T.Point(40, 60)
    });
    var markerE = new T.Marker(new T.LngLat(endPoint[0], endPoint[1]), { icon: icon_slicedRiv_ep });
    map.addOverLay(markerE);
    overLayList.push(markerE)

    //汇入点图元
    for (let i = 0; i < infoList.length - 1; i++) {
        var crossPoint = infoList[i][4]
        var icon_slicedRiv_cp = new T.Icon({
            iconUrl: `/Public/imgs/path-cross-${i + 1}.png`,
            iconSize: new T.Point(80, 80),
            iconAnchor: new T.Point(40, 60)
        });
        var markerC = new T.Marker(new T.LngLat(crossPoint[0], crossPoint[1]), { icon: icon_slicedRiv_cp });
        map.addOverLay(markerC);
        overLayList.push(markerC)
    }
    //河流分段线图元
    for(let i = 0; i <infoList.length;i++){
        var rivSlicedTDTPolyline = infoList[i][5]
        map.addOverLay(rivSlicedTDTPolyline);
        overLayList.push(rivSlicedTDTPolyline)
    }
}
//调整view
function setViewPort(infoList){
    var coordList = []
    infoList.forEach(info=>{
        info[5].getLngLats().forEach(coord=>{
            coordList.push(coord)
        })
    })
    var m_center = map.getViewport(coordList).center
    var m_zoom = map.getViewport(coordList).zoom 
    map.centerAndZoom(m_center,m_zoom)
}

//信息表dom设置
function setInfoPanel(infoList, allCountyPolygon){
    $("#compassContainer").empty()
    $("#compassContainer").prepend("<div id='compass'></div>")
    
    $("#confluencePointInfos").empty();
    $("#confluencePointInfos").prepend("<span id='title'>汇入点信息</span>")
    
    $("#confluencePointInfos").append("<div class='cp-info' id='sp-info'>")
    $("#confluencePointInfos").append("<div class='cp-info' id='ep-info'>")
    $("#confluencePointInfos").append("<div class='cp-info' id='cp1-info'>")
    $("#confluencePointInfos").append("<div class='cp-info' id='cp2-info'>")
    $("#confluencePointInfos").append("<div class='cp-info' id='cp3-info'>")
    $("#confluencePointInfos").append("<div class='cp-info' id='cp4-info'>")
    $("#confluencePointInfos").append("<div class='cp-info' id='cp5-info'>")

    $("#slicedRiverInfos").empty();
    // $("#slicedRiverInfos").prepend("<span id='title'>河段信息</span>")

    $("#slicedRiverInfos").append("<span class='sr-info' id='riv1-info'>")
    $("#slicedRiverInfos").append("<span class='sr-info' id='riv2-info'>")
    $("#slicedRiverInfos").append("<span class='sr-info' id='riv3-info'>")
    $("#slicedRiverInfos").append("<span class='sr-info' id='riv4-info'>")
    $("#slicedRiverInfos").append("<span class='sr-info' id='riv5-info'>")
   
    //起点信息
    var sp_riv_name = infoList[0][0]
    var sp_E = infoList[0][3][0].toFixed(2)
    var sp_N = infoList[0][3][1].toFixed(2)
    var sp_Info = `<div class='info-point-icon' id='sp-icon'></div><span id='cp-span1'>起点:${sp_riv_name}</span><span id='cp-span2'>坐标:${sp_E},${sp_N}</span>`
    $("#sp-info").append(sp_Info)
    //终点信息
    var ep_riv_name = infoList.at(-1)[0]
    var ep_E = infoList.at(-1)[4][0].toFixed(2)
    var ep_N = infoList.at(-1)[4][1].toFixed(2)
    var ep_Info = `<div class='info-point-icon' id='ep-icon'></div><span id='cp-span1'>终点:${ep_riv_name}</span><span id='cp-span2'>坐标:${ep_E},${ep_N}</span>`
    $("#ep-info").append(ep_Info)

    //汇入点信息
    for (let i = 0; i < infoList.length - 1; i++) {
        var cp_name = infoList[i][0] + "-汇入-" + infoList[i + 1][0]
        var cp_E = infoList[i][4][0].toFixed(2)
        var cp_N = infoList[i][4][1].toFixed(2)
        var cp_info = `<div class='info-point-icon' id='cp${i + 1}-icon'></div><span id='cp-span1'>汇入点${i+1}:${cp_name}</span><span id='cp-span2'>坐标:${cp_E},${cp_N}</span>`
        $(`#cp${i + 1}-info`).append(cp_info)
    }

    //河段信息
    var totalLen = 0

    for(let i=0;i<infoList.length;i++){
        var riv_name = infoList[i][0]
        var riv_length = infoList[i][2]
        totalLen += parseFloat(riv_length)
        var riv_level = infoList[i][1]
        var riv_color = setSlicedRivColorWidth(riv_level)[0]
        var riv_width = setSlicedRivColorWidth(riv_level)[1]
        var riv_polyline = infoList[i][6];

        var riv_clip_res = getClipRivByCounty(allCountyPolygon, riv_polyline)
        var riv_clip_span = '';
        for(let j=0;j<riv_clip_res.length;j++){
            var riv_county_name = riv_clip_res[j][0]
            var riv_county_lenth = (riv_clip_res[j][1][0]/1000).toFixed(2)
            riv_clip_span += `${riv_county_name}: ${riv_county_lenth}` + "<br>"
        }

        var sliced_riv_Info = `<div class='info-polyline-icon' id='riv${i + 1}-icon' style='--bg-color : ${riv_color};--wid: ${riv_width}px'></div><span id='sr-span1'>${riv_name}</span><span id='sr-span2'>长度:${riv_length}</span><span id='sr-span3'>${riv_clip_span}</span>`
        $(`#riv${i+1}-info`).append(sliced_riv_Info)
    }
    var totalInfo = `<span id='title'>河段信息----(总长:${totalLen.toFixed(2)}公里)</span>`
    $("#slicedRiverInfos").prepend(totalInfo)
}
//获取县域内slicedRiv
function getClipRivByCounty(countyList,rivPolyline){
    var res = [];
    countyList.forEach(county=>{
        var rivs = clipPolylineWithMidPoints(rivPolyline, county[0]);
        if (rivs.length !==0){
            res.push([county[1], sumLength(rivs)])
        }
    })
    return res
}

//合计slicedRiv长度
function sumLength(rivList){
    var totalLen =[];
    if (rivList.length == 1){
        totalLen.push(calculatePolylineLength(rivList[0]))
    } else if (rivList.length > 1){
        rivList.forEach(riv=>{
            totalLen.push(riv)
        })
    }
    return totalLen
}