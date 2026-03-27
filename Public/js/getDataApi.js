/**
 * 获取县边界的json
 */
function getCountyJSON() {
    return $.get("https://geo.datav.aliyun.com/areas_v3/bound/511827.json");
}

/**
 * 获取河流data
 */

function getRiverData() {
    return $.get("/Public/data/rivers.json");
}

/**
 * 获取污染源
 */

function getPolutionSource() {
    return $.get("../Public/data/polutionSource.json");
}

/**
 * 获取湖泊水体
 */

function getLakeData() {
    return $.get("../Public/data/lake2.json");
}