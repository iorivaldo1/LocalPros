

// ================== 坐标转换辅助函数 开始 ==================
var PI = 3.1415926535897932384626;
var a = 6378245.0;
var ee = 0.00669342162296594323;

function transformlat(lng, lat) {
    var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformlng(lng, lat) {
    var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}

// BD-09 to GCJ-02
function bd09togcj02(bd_lon, bd_lat) {
    var x_pi = 3.14159265358979324 * 3000.0 / 180.0;
    var x = bd_lon - 0.0065;
    var y = bd_lat - 0.006;
    var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
    var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
    var gg_lng = z * Math.cos(theta);
    var gg_lat = z * Math.sin(theta);
    return [gg_lng, gg_lat];
}

// GCJ-02 to WGS-84
function gcj02towgs84(lng, lat) {
    var dlat = transformlat(lng - 105.0, lat - 35.0);
    var dlng = transformlng(lng - 105.0, lat - 35.0);
    var radlat = lat / 180.0 * PI;
    var magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    var sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
    var mglat = lat + dlat;
    var mglng = lng + dlng;
    return [lng * 2 - mglng, lat * 2 - mglat];
}

function bd09ToWgs84(lng, lat) {
    var gcj = bd09togcj02(lng, lat);
    return gcj02towgs84(gcj[0], gcj[1]);
}

//墨卡托转百度经纬度（BD-09MC → BD-09）
// 百度使用分段多项式投影，非标准墨卡托，需用反向系数表
// 系数来源：社区逆向工程（与官方 proj.pointToLngLat 结果吻合）
function bd09mcToLngLat(x, y) {
  // 纬度分段阈值（y 轴方向，米）
  var MCBAND = [12890594.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0];

  // 每行 10 个系数：
  //   cC[0], cC[1]        → 经度线性项：lng = cC[0] + cC[1] * |x|
  //   cC[2]~cC[8], cC[9] → 纬度多项式：T = |y|/cC[9], lat = Σ cC[2+k]*T^k (k=0..6)
  var MC2LL = [
    [1.410526172116255e-8,  0.00000898305509648872,  -1.9939833816331,    200.9824383106796,  -187.2403703815547,  91.6087516669843,   -23.38765649603339,  2.57121317296198,   -0.03801620996175,   17337981.2  ],
    [-7.435856389565537e-9, 0.000008983055097726239, -0.78625201886289,   96.32687599990095,  -1.85204757529826,   -59.36935905498657,  47.40033549296737,  -16.50741931063887,  2.28786674699375,   10260144.86 ],
    [-3.030883460898826e-8, 0.00000898305509983578,   0.30071316287616,   59.74293618442277,   7.357984074871,     -25.38371002664745,  13.45380521110908,  -3.29883767235584,   0.32710905363475,    6856817.37 ],
    [-1.981981304930552e-8, 0.000008983055099779535,  0.03278182852591,   40.31678527705744,   0.65659298677277,   -4.44255534477492,   0.85341911805263,    0.12923347998204,  -0.04625736007561,    4482777.06 ],
    [3.09191371068437e-9,   0.000008983055096812155,  0.00006995724062,   23.10934304144901,  -0.00023663490511,   -0.6321817810242,   -0.00663494467273,    0.03430082397953,  -0.00466043876332,    2555164.4  ],
    [2.890871144776878e-9,  0.000008983055095805407, -3.068298457659e-8,   7.47137025468032,  -3.53937994e-13,     -0.02145144861037,  -0.00001234426596,    0.00010322952773,  -0.00000323890364,     826088.5  ]
  ];

  var cC = null;
  for (var i = 0; i < MCBAND.length; i++) {
    if (Math.abs(y) >= MCBAND[i]) {
      cC = MC2LL[i];
      break;
    }
  }
  if (!cC) return { lng: 0, lat: 0 };

  // 经度：线性转换
  var lng = cC[0] + cC[1] * Math.abs(x);

  // 纬度：分段多项式（6阶）
  var T = Math.abs(y) / cC[9];
  var lat = cC[2] + cC[3]*T + cC[4]*Math.pow(T,2) + cC[5]*Math.pow(T,3)
          + cC[6]*Math.pow(T,4) + cC[7]*Math.pow(T,5) + cC[8]*Math.pow(T,6);

  // 处理西经 / 南纬
  if (x < 0) lng = -lng;
  if (y < 0) lat = -lat;

  return { lng, lat }; // 结果是 BD-09 经纬度
}

// ================== 反向转换链（WGS-84 → BD-09MC）开始 ==================

// WGS-84 to GCJ-02（正向偏移，近似，误差 < 0.5m）
function wgs84togcj02(lng, lat) {
    var dlat = transformlat(lng - 105.0, lat - 35.0);
    var dlng = transformlng(lng - 105.0, lat - 35.0);
    var radlat = lat / 180.0 * PI;
    var magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    var sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
    return [lng + dlng, lat + dlat];
}

// GCJ-02 to BD-09
function gcj02tobd09(lng, lat) {
    var x_pi = 3.14159265358979324 * 3000.0 / 180.0;
    var z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_pi);
    var theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_pi);
    return [z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006];
}

// BD-09 to BD-09MC（百度经纬度 → 百度墨卡托）
// 系数来源：社区逆向工程（与官方 proj.pointToMercator 结果吻合）
function lngLatToBd09mc(lng, lat) {
    // 纬度分段阈值（单位：度，降序排列）
    var LLBAND = [75, 60, 45, 30, 15, 0];

    // 每行 10 个系数（结构与 MC2LL 完全对称）：
    //   cC[0], cC[1]        → x 线性项：  x = cC[0] + cC[1] * |lng|
    //   cC[2]~cC[8], cC[9] → y 多项式：  T = |lat|/cC[9], y = Σ cC[2+k]*T^k (k=0..6)
    var LL2MC = [
        [-0.0015702102444,      111320.7020616939,  1704480524535203.0,  -10338987376042340.0,  26112667856603880.0,  -35149669176653700.0,  26595700718403920.0,  -10725012454188240.0,  1800819912950474.0,   82.5 ],
        [ 0.0008277824516172526, 111320.7020463578,   647795574.6671607,   -4082003173.641316,   10774905663.51142,   -15171875531.51559,    12053065338.62167,    -5124939663.577472,    913311935.9512032,   67.5 ],
        [ 0.00337398766765,      111320.7020202162,   4481351.045890365,   -23393751.19931662,   79682215.47186455,   -115964993.2797253,    97236711.15602145,    -43661946.33752821,    8477230.501135234,   52.5 ],
        [ 0.00220636496208,      111320.7020209128,   51751.86112841131,    3796837.749470245,    992013.7397791013,   -1221952.21711287,     1340652.697009075,    -620943.6990984312,    144416.9293806241,   37.5 ],
        [-0.0003441963408,       111320.7020576856,   278.2353960772752,    2485758.690035394,    6070.750963243378,    54821.18345352118,     9540.606633304236,    -2710.55326746645,     1405.483844121726,   22.5 ],
        [-0.0003218135878,       111320.7020701615,   0.1724480950350963,   1020087.910529513,    1.745752439166682,    0.1474843040809512,    0,                    0,                     0,                    7.45 ]
    ];

    var cC = null;
    for (var i = 0; i < LLBAND.length; i++) {
        if (Math.abs(lat) > LLBAND[i]) {
            cC = LL2MC[i];
            break;
        }
    }
    // 纬度 = 0° 时落入最后一段
    if (!cC) cC = LL2MC[LL2MC.length - 1];

    // x：经度线性转换
    var x = cC[0] + cC[1] * Math.abs(lng);

    // y：纬度分段多项式（6阶）
    var T = Math.abs(lat) / cC[9];
    var y = cC[2] + cC[3]*T + cC[4]*Math.pow(T,2) + cC[5]*Math.pow(T,3)
          + cC[6]*Math.pow(T,4) + cC[7]*Math.pow(T,5) + cC[8]*Math.pow(T,6);

    // 处理西经 / 南纬
    if (lng < 0) x = -x;
    if (lat < 0) y = -y;

    return { x, y }; // 结果是 BD-09MC 墨卡托坐标（单位：米）
}

// WGS-84 → BD-09MC（完整反向链）
function wgs84ToBd09mc(lng, lat) {
    var gcj  = wgs84togcj02(lng, lat);       // Step 1: WGS-84  → GCJ-02
    var bd09 = gcj02tobd09(gcj[0], gcj[1]);  // Step 2: GCJ-02  → BD-09
    return lngLatToBd09mc(bd09[0], bd09[1]); // Step 3: BD-09   → BD-09MC
}

// ================== 反向转换链（WGS-84 → BD-09MC）结束 ==================

// ================== 坐标转换辅助函数 结束 ==================
