//单色扩散圆环(变淡)
const HorizontalRing =
  `
czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st; // 获取纹理坐标

    float dist = distance(st, vec2(0.5)); // 计算当前像素到中心的距离
    float time = clamp(fract(czm_frameNumber / 500.0)*0.5,0.0,0.5);
    float time2 = time + 0.01;
    float val = step(time,dist) * step(-time2,-dist);

    float dist2 = 0.5 - distance(st, vec2(0.5));
    float val2 = smoothstep(0.0,0.5,dist2) *(1.0 - step(0.5,dist2));

    material.diffuse = vec3(val2,0,0);
    material.alpha = val + val2;
    return material;
}
`

//水平彩色连环扩散圆环
const shaderHorizontalColorMultiRings = `
czm_material czm_getMaterial(czm_materialInput materialInput){
      czm_material material = czm_getDefaultMaterial(materialInput);

      vec2 st = materialInput.st;
      float time = clamp(fract(czm_frameNumber / speed)*0.1,0.0,0.5);

      float dist1 = distance(st, vec2(0.5)) - 0.0;
      float val1 = step(time,dist1) * (1.0 -  step(time + 0.01,dist1));

      float dist2 = distance(st, vec2(0.5)) - 0.1; 
      float val2 = step(time,dist2) * (1.0 -  step(time + 0.01,dist2));

      float dist3 = distance(st, vec2(0.5)) - 0.2; 
      float val3 = step(time,dist3) * (1.0 -  step(time + 0.01,dist3));

      float dist4 = distance(st, vec2(0.5)) - 0.3;
      float val4 = step(time,dist4) * (1.0 -  step(time + 0.01,dist4));

      float dist5 = distance(st, vec2(0.5)) - 0.4;
      float val5 = step(time,dist5) * (1.0 -  step(time + 0.01,dist5));


      material.diffuse = color1.rgb*val1 +  color2.rgb*val2 + color3.rgb*val3 + color4.rgb*val4 + color5.rgb*val5;
      material.alpha = val1 + val2 + val3 + val4 + val5;
      return material;
  }

`;

//水平连环扩散圆环
const shaderMultiHorizontalRings =
  `
            czm_material czm_getMaterial(czm_materialInput materialInput){
                czm_material material = czm_getDefaultMaterial(materialInput);

                vec2 st = materialInput.st; // 获取纹理坐标

                float dist1 = distance(st, vec2(0.5)) - 0.1; // 计算当前像素到中心的距离
                float time1 = clamp(fract(czm_frameNumber / speed)*0.1,0.0,0.5);
                float val1 = step(time1,dist1) * (1.0 -  step(time1 + 0.01,dist1));

                float dist2 = distance(st, vec2(0.5)) - 0.2; // 计算当前像素到中心的距离
                float time2 = clamp(fract(czm_frameNumber / speed)*0.1,0.0,0.5);
                float val2 = step(time2,dist2) * (1.0 -  step(time2 + 0.01,dist2));

                float dist3 = distance(st, vec2(0.5)) - 0.3; // 计算当前像素到中心的距离
                float time3 = clamp(fract(czm_frameNumber / speed)*0.1,0.0,0.5);
                float val3 = step(time3,dist3) * (1.0 -  step(time3 + 0.01,dist3));

                material.diffuse = color.rgb;
                material.alpha = val1 + val2 + val3;
                return material;
            }
        `

//静态圆环-多颜色
const shaderStaticRingMultiColor = `
czm_material czm_getMaterial(czm_materialInput materialInput){
      czm_material material = czm_getDefaultMaterial(materialInput);

      vec2 st = materialInput.st; // 获取纹理坐标

      float dist = distance(st, vec2(0.5)); // 计算当前像素到中心的距离
      float val1 = step(0.49 , dist);
      float val2 = step(0.39 , dist )*(1.0 - step(0.4,dist)); 
      float val3 = step(0.29 , dist )*(1.0 - step(0.3,dist));
      float val4 = step(0.19 , dist )*(1.0 - step(0.2,dist));
      float val5 = step(0.09 , dist )*(1.0 - step(0.1,dist));

      material.diffuse = color1.rgb*val1 + color2.rgb*val2 + color3.rgb*val3 + color4.rgb*val4 +color5.rgb*val5   ;
      material.alpha = val1 + val2 + val3 + val4 + val5;
      return material;
  }

`;

//静态圆环-多颜色-平滑过渡-由内向外
const shaderStaticRingMultiColorSmoothCTO = `
czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st; // 获取纹理坐标
    float dist = 0.5 - distance(st, vec2(0.5));
    float val1 = smoothstep(0.0,0.1,dist) *(1.0 - step(0.1,dist));
    float val2 = smoothstep(0.1,0.2,dist) *(1.0 - step(0.2,dist));
    float val3 = smoothstep(0.2,0.3,dist) *(1.0 - step(0.3,dist));
    float val4 = smoothstep(0.3,0.4,dist) *(1.0 - step(0.4,dist));
    float val5 = smoothstep(0.4,0.5,dist) *(1.0 - step(0.5,dist));
    material.diffuse = color1.rgb*val1+color2.rgb*val2+color3.rgb*val3+color4.rgb*val4+color5.rgb*val5;
    material.alpha =  val1 + val2 + val3 + val4 + val5;
    
    return material;
  }

`;


//静态圆环-多颜色-平滑过渡-由外向内
const shaderStaticRingMultiColorSmoothOTC = `
czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st; // 获取纹理坐标

    float dist = distance(st, vec2(0.5)); 
    float val1 = smoothstep(0.4,0.5,dist)*(1.0 - step(0.5,dist)) ;
    float val2 = smoothstep(0.3,0.4,dist)*(1.0 - step(0.4,dist)) ;
    float val3 = smoothstep(0.2,0.3,dist)*(1.0 - step(0.3,dist)) ;
    float val4 = smoothstep(0.1,0.2,dist)*(1.0 - step(0.2,dist)) ;
    float val5 = smoothstep(0.0,0.1,dist)*(1.0 - step(0.1,dist)) ;
    material.diffuse = color1.rgb*val1+color2.rgb*val2+color3.rgb*val3+color4.rgb*val4+color5.rgb*val5 ;
    material.alpha =  val1 + val2 + val3 + val4 + val5;
   
    return material;
  }

`;

//静态圆环
const shaderStaticRing = `
czm_material czm_getMaterial(czm_materialInput materialInput){
                czm_material material = czm_getDefaultMaterial(materialInput);

                vec2 st = materialInput.st; // 获取纹理坐标

                float dist = distance(st, vec2(0.5)); // 计算当前像素到中心的距离
                float val1 = step(0.49 , dist);
                float val2 = step(0.39 , dist )*(1.0 - step(0.4,dist)); 
                float val3 = step(0.29 , dist )*(1.0 - step(0.3,dist));
                float val4 = step(0.19 , dist )*(1.0 - step(0.2,dist));
                float val5 = step(0.09 , dist )*(1.0 - step(0.1,dist));

                material.diffuse = color.rgb;
                material.alpha = val1 + val2 + val3 + val4 + val5;
                return material;
            }

`;


const shaderPolution = `
 uniform vec4 color;
 uniform float speed;
                czm_material czm_getMaterial(czm_materialInput materialInput){
                    czm_material material = czm_getDefaultMaterial(materialInput);

                    vec2 st = materialInput.st; // 获取纹理坐标

                    float dist = distance(st, vec2(0.5)); // 计算当前像素到中心的距离
                    float time = clamp(fract(czm_frameNumber / speed)*0.5,0.0,0.5);
                    float val = step(time,dist) * (1.0 -  step(time + 0.01,dist));
                    material.diffuse = color.rgb;
                    material.alpha = val;
                    return material;
                }
`;

const shaderSourceGasStation = `
    uniform vec4 color;
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);

        vec2 st = materialInput.st; // 获取纹理坐标

        float dist = distance(st, vec2(0.5)); // 计算当前像素到中心的距离
        float time = clamp(fract(czm_frameNumber / 200.0)*0.5,0.0,0.5);
        float time2 = time + 0.01;
        float val = step(time,dist) * step(-time2,-dist);
        material.diffuse = color.rgb;
        material.alpha = val;
        return material;
    }
`;

const shaderGrass = `
      uniform vec4 grassColor;
      uniform vec4 dirtColor;
      uniform float patchiness;
      czm_material czm_getMaterial(czm_materialInput materialInput)
        {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;
          float noise1 = (st * patchiness * 1.0) * 1.0;
          float noise2 = (st * patchiness * 2.0) * 0.5;
          float noise3 = (st * patchiness * 4.0) * 0.25;
          float noise = sin(noise1 + noise2 + noise3) * 0.1;
          vec4 color = mix(grassColor, dirtColor, noise);
          float verticalNoise = vec2(st.x * 100.0, st.y * 20.0).st * 0.02;
          float horizontalNoise = vec2(st.x * 20.0, st.y * 100.0).st * 0.02;
          float stripeNoise = min(verticalNoise, horizontalNoise);
          color.rgb += stripeNoise;
          material.diffuse = color.rgb;
          material.alpha = color.a;
          return material;
        }

`;

const shader3 = `
    uniform vec4 color;
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);

        vec2 st = materialInput.st; // 获取纹理坐标

        float dist = distance(st, vec2(0.5)); // 计算当前像素到中心的距离
        float time = clamp(fract(czm_frameNumber / 2000.0)*0.5,0.0,0.5);
        float time2 = time - 0.01;
        float val = step(0.5 - time,dist) * step(-0.5 + time2,-dist);
        material.diffuse = color.rgb;
        material.alpha = val;
        return material;
    }
`;
//从下往上
const shaderSourceBTU = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    float time = fract(czm_frameNumber / 2000.0);
    float time2 = time + 0.01;
    float val = step(time, st.t) * step(-time2,-st.t);
    material.alpha = val;
    material.diffuse = color.rgb;
    return material;
}
`;
//从上往下
const shaderSourceUTB = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    float time = fract(czm_frameNumber / 600.0);
    float time2 = time - 0.05;
    float val1 = step(1.0 - time, st.t) * step(-1.0 + time2,-st.t);
    float val2 = 1.0 - val1;
    val1 += .05;
    val2 += .9;
    material.alpha = val1 * val2  ;
    material.diffuse = color.rgb * val1 + color5.rgb * val2;
    return material;
}
`;

//多重静态圆环
const shaderMultiRings = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float ring1 = step(0.1,st.t)*(1.0 - step(0.12,st.t));
    float ring2 = step(0.3,st.t)*(1.0 - step(0.32,st.t));
    float ring3 = step(0.6,st.t)*(1.0 - step(0.62,st.t));
    float ring4 = step(0.8,st.t)*(1.0 - step(0.82,st.t));

    float val = ring1 + ring2 + ring3 + ring4;

    material.alpha = val;
    material.diffuse = color.rgb;
    return material;
}
`;

//多重静态圆环2
const shaderMultiRings2 = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float ring1 = step(0.1,st.t)*(1.0 - step(0.1,st.t - 0.01));
    float ring2 = step(0.5,st.t)*(1.0 - step(0.5,st.t  - 0.01));
    float val = ring1 + ring2;
    material.alpha = val;
    material.diffuse = color.rgb;
    return material;
}
`;

//多重动态圆环
const shaderDynamicsMultiRings = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float time = fract(czm_frameNumber / 1000.0);
    float ringwidth = 0.01;
    float val1 = step(time,st.t)*(1.0 - step(time + (1.0 * ringwidth),st.t));
    float val2 = step(time + 0.2,st.t)*(1.0 - step(time + 0.2 + (1.0 * ringwidth),st.t));
    float val3 = step(time + 0.5,st.t)*(1.0 - step(time + 0.5 + (1.0 * ringwidth),st.t));
    float val4 = step(time + 0.8,st.t)*(1.0 - step(time + 0.8 + (1.0 * ringwidth),st.t));
    
    material.alpha = val1 + val2 + val3 + val4;
    material.diffuse = color.rgb;
    return material;
}
`;

//多重动态圆环2
const shaderDynamicsMultiRings2 = `
    uniform vec4 color;
    uniform vec4 color2;
    uniform vec4 color3;
    uniform vec4 color4;
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float time = fract(czm_frameNumber / 2000.0);
    float ringwidth = 0.01;
    float val1 = step(time,st.t)*(1.0 - step(time + (1.0 * ringwidth),st.t));
    float val2 = step(fract(time + 0.25),st.t)*(1.0 - step(fract(time + 0.25) + (1.0 * ringwidth),st.t));
    float val3 = step(fract(time + 0.5),st.t)*(1.0 - step(fract(time + 0.5) + (1.0 * ringwidth),st.t));
    float val4 = step(fract(time + 0.75),st.t)*(1.0 - step(fract(time + 0.75) + (1.0 * ringwidth),st.t));
    val1 += .5;
    float valall =  val1 + val2 + val3 + val4;
    
    material.alpha = valall*valall;
    material.diffuse = color.rgb * val1 + color2.rgb * val2 + color3.rgb * val3 + color4.rgb * val4;

    return material;
}
`;

//多重动态圆环3-从上往下
const shaderDynamicsMultiRings3 = `
    uniform vec4 color;
    uniform vec4 color2;
    uniform vec4 color3;
    uniform vec4 color4;
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    
    float time = fract(czm_frameNumber / 2000.0);
    float ringwidth = 0.01;
    float val1 = step(fract(1.0 - time),st.t)*step(-1.0 + fract(  time - ringwidth),-st.t);
    float val2 = step(fract(1.0 - time - 0.25),st.t)*step(-1.0 + fract(time + 0.25 - ringwidth),-st.t);
    float val3 = step(fract(1.0 - time - 0.5),st.t)*step(-1.0 + fract(time + 0.5 - ringwidth),-st.t);
    float val4 = step(fract(1.0 - time - 0.75),st.t)*step(-1.0 + fract(time + 0.75 - ringwidth),-st.t);
    val1 += .4;
    float valall = val1 + val2 + val3 + val4;

    material.alpha = valall*valall;
    material.diffuse = color.rgb * val1 + color2.rgb * val2 + color3.rgb * val3 + color4.rgb * val4;

    return material;
}
`;

//多重动态圆环4-从上往下-
const shaderDynamicsMultiRings4 = `
    uniform vec4 color;
    uniform vec4 color2;
    uniform vec4 color3;
    uniform vec4 color4;
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    
    float time = fract(czm_frameNumber / 2000.0);
    float ringwidth = 0.01;
    float val1 = step(fract(1.0 - time),st.t)*step(-1.0 + fract(  time - ringwidth),-st.t);
    float val2 = step(fract(1.0 - time - 0.25),st.t)*step(-1.0 + fract(time + 0.25 - ringwidth),-st.t);
    float val3 = step(fract(1.0 - time - 0.5),st.t)*step(-1.0 + fract(time + 0.5 - ringwidth),-st.t);
    float val4 = step(fract(1.0 - time - 0.75),st.t)*step(-1.0 + fract(time + 0.75 - ringwidth),-st.t);
    val1 += .4;
    float valall = val1 + val2 + val3 + val4;

    material.alpha = valall*valall;
    material.diffuse = color.rgb * val1 + color2.rgb * val2 + color3.rgb * val3 + color4.rgb * val4;

    return material;
}
`;

const shaderSourceRiver = `
  czm_material czm_getMaterial(czm_materialInput materialInput){
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      vec4 colorImage = texture(image, vec2(fract((st.s - speed * czm_frameNumber * 0.001)), st.t));
      material.alpha = colorImage.a * color.a;
      material.diffuse = colorImage.rgb * 1.5 ;
      return material;
    }`;

/**
 * 注册相机显示
 */
function regCameraInfo(viewer) {
  viewer.camera.changed.addEventListener(() => {
    let heading = Cesium.Math.toDegrees(viewer.camera.heading).toFixed(2);
    let pitch = Cesium.Math.toDegrees(viewer.camera.pitch).toFixed(2);
    let viewHeight = viewer.camera.positionCartographic.height.toFixed(2);
    var positionCartographic = Cesium.Cartographic.fromCartesian(
      viewer.camera.position
    );
    var longitude = Cesium.Math.toDegrees(
      positionCartographic.longitude
    ).toFixed(2);
    var latitude = Cesium.Math.toDegrees(positionCartographic.latitude).toFixed(
      2
    );
    var height = positionCartographic.height.toFixed(2);
    $("#c-heading").text(`heading:${heading}`);
    $("#c-pitch").text(`pitch:${pitch}`);
    $("#c-jd").text(`视角经度:${longitude}`);
    $("#c-wd").text(`视角纬度:${latitude}`);
    $("#c-height").text(`视角高度:${height}`);
  });
}

/**
 * 计算polyline的WGS84椭球上的长度
 */

function calculatePolylineLength(
  positions,
  ellipsoid = Cesium.Ellipsoid.WGS84
) {
  let totalDistance = 0;
  for (let i = 0; i < positions.length - 1; ++i) {
    const startCartesian = Cesium.Cartographic.fromDegrees(
      positions[i][0],
      positions[i][1]
    );

    const endCartesian = Cesium.Cartographic.fromDegrees(
      positions[i + 1][0],
      positions[i + 1][1]
    );
    const geodesic = new Cesium.EllipsoidGeodesic(
      startCartesian,
      endCartesian,
      ellipsoid
    );
    const segmentDistance = geodesic.surfaceDistance;

    totalDistance += segmentDistance;
  }

  return totalDistance; // 转换为公里单位
}
/**
 * 计算在polyline上的中点的坐标
 */
function calMidPointOnPolyline(
  positions,
  ellipsoid = Cesium.Ellipsoid.WGS84,
  totalDis
) {
  let totalDistance = 0;
  let disToMiddle = totalDis / 2;
  let pointIndex = 0;
  for (let i = 0; i < positions.length - 1; ++i) {
    const startCartesian = Cesium.Cartographic.fromDegrees(
      positions[i][0],
      positions[i][1]
    );

    const endCartesian = Cesium.Cartographic.fromDegrees(
      positions[i + 1][0],
      positions[i + 1][1]
    );
    const geodesic = new Cesium.EllipsoidGeodesic(
      startCartesian,
      endCartesian,
      ellipsoid
    );
    const segmentDistance = geodesic.surfaceDistance;

    totalDistance += segmentDistance;
    if (Math.abs(totalDistance - totalDis / 2) < disToMiddle) {
      disToMiddle = Math.abs(totalDistance - totalDis / 2);
      pointIndex = i;
    }
  }
  var jd = (positions[pointIndex][0] + positions[pointIndex + 1][0]) / 2;
  var wd = (positions[pointIndex][1] + positions[pointIndex + 1][1]) / 2;
  return [jd, wd];
}
/**
 * 设置riv-primitive的宽度
 */
function setRiverWidth(rivlevel) {
  var rivWidth;
  switch (rivlevel) {
    case 1:
      rivWidth = 6;
      break;
    case 2:
      rivWidth = 4;
      break;
    case 3:
      rivWidth = 2;
      break;
  }
  return rivWidth;
}
/**
 * 根据rivlevel设置riv-primitive的billboard的图片
 */
function setRiverBillboardImgUrl(rivlevel) {
  var imgUrl;
  switch (rivlevel) {
    case 1:
      imgUrl = "../Public/imgs/riv-bib-l1.png";
      break;
    case 2:
      imgUrl = "../Public/imgs/riv-bib-l2.png";
      break;
    case 3:
      imgUrl = "../Public/imgs/riv-bib-l3.png";
      break;
  }
  return imgUrl;
}

/**
 * 注册primitive的点击事件
 */
function regClickPrimitive(viewer) {
  // 初始化 ScreenSpaceEventHandler
  let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction(function (event) {
    // 获取屏幕上的二维坐标
    let cartesian2 = event.position;

    // 使用 scene.pick() 检测当前像素下的对象
    let pickedObject = viewer.scene.pick(cartesian2);

    if (Cesium.defined(pickedObject)) {
      console.log("Picked a Primitive:", pickedObject.id);
    } else {
      console.log("No objects were picked at this position.");
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * 根据polution-source的type设置billboard的图片
 */
function setPolutionSourceBillboardImgUrl(type) {
  var imgUrl;
  switch (type) {
    case "gas_station":
      imgUrl = "../Public/imgs/polutionsource-gasstation.png";
      break;
    case "factory":
      imgUrl = "../Public/imgs/polutionsource-factory.png";
      break;
    case "hospital":
      imgUrl = "../Public/imgs/polutionsource-hospital.png";
      break;
  }
  return imgUrl;
}

/**
 * 根据polution-source的type设置扩散圈的颜色
 */
function setPolutionSourceRingColor(type) {
  var r_color;
  switch (type) {
    case "gas_station":
      r_color = new Cesium.Color(0.9, 0, 0, 0.9);
      break;
    case "factory":
      r_color = new Cesium.Color(0.8, 0.5, 0, 0.8);
      break;
    case "hospital":
      r_color = new Cesium.Color(0.7, 0, 0.8, 0.5);
      break;
  }
  return r_color;
}

/**
 * 根据polution-source的type设置扩散圈的速度
 */
function setPolutionSourceRingSpeed(type) {
  var r_speed;
  switch (type) {
    case "gas_station":
      r_speed = 200;
      break;
    case "factory":
      r_speed = 500;
      break;
    case "hospital":
      r_speed = 1000;
      break;
  }
  return r_speed;
}

/**
 * 根据polution-source的type设置扩散圈直径
 */
function setPolutionSourceRingRadius(type) {
  var r_radius;
  switch (type) {
    case "gas_station":
      r_radius = 1000;
      break;
    case "factory":
      r_radius = 2000;
      break;
    case "hospital":
      r_radius = 500;
      break;
  }
  return r_radius;
}

/**
 * 注册界面按钮
 */
function initButtons(riv_list, polution_list, lake_list) {
  $("#river-button").click(function () {
    riv_list.forEach((riv) => {
      riv.show = !riv.show;
    });
  });
  $("#polution-button").click(function () {
    polution_list.forEach((polution) => {
      polution.show = !polution.show;
    });
  });
  $("#lake-button").click(function () {
    lake_list.forEach((lake) => {
      lake.show = !lake.show;
    });
  });
}

//计算polygon质心

function getCentroid(polygonArrayList) {
  let area = 0,
    centroidX = 0,
    centroidY = 0;
  for (let i = 0; i < polygonArrayList.length - 1; i++) {
    const x1 = polygonArrayList[i][0];
    const y1 = polygonArrayList[i][1];

    const x2 = polygonArrayList[i + 1][0];
    const y2 = polygonArrayList[i + 1][1];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    centroidX += (x1 + x2) * cross;
    centroidY += (y1 + y2) * cross;
  }
  area /= 2;
  centroidX /= 6 * area;
  centroidY /= 6 * area;

  return [centroidX, centroidY];
}
//设置polution颜色
function setPolutionSourceRingColor(type) {
  var r_color;
  switch (type) {
    case "gas_station":
      r_color = new Cesium.Color(0.9, 0, 0, 0.9);
      break;
    case "factory":
      r_color = new Cesium.Color(0.8, 0.5, 0, 0.8);
      break;
    case "hospital":
      r_color = new Cesium.Color(0.7, 0, 0.8, 0.5);
      break;
  }
  return r_color;
}

// function getPolygonExtent(geometry) {
//   const positions = geometry.attributes.position.values;
//   const ellipsoid = viewer.scene.globe.ellipsoid;
//   // console.log(positions[0])
//   console.log(ellipsoid.cartesianToCartographic(positions[0]))

//   // let west = 180, east = -180, south = 90, north = -90;

//   // positions.forEach(cartesian3 => {
//   //   const cartographic = ellipsoid.cartesianToCartographic(cartesian3);
//   //   const lon = Cesium.Math.toDegrees(cartographic.longitude);
//   //   const lat = Cesium.Math.toDegrees(cartographic.latitude);

//   //   west = Math.min(west, lon);
//   //   east = Math.max(east, lon);
//   //   south = Math.min(south, lat);
//   //   north = Math.max(north, lat);
//   // });


//   // return { west, east, south, north }; // 返回四至的度数
// }

async function getSamplePointList(points){
  let west = 180, east = -180, south = 90, north = -90;
  points.forEach(point=>{
    west = Math.min(west, point[0]);
    east = Math.max(east, point[0]);
    south = Math.min(south, point[1]);
    north = Math.max(north, point[1]);
  })
  var pointList = []
  var x = west

  while (x < east) {
    var y = south
    while (y < north) {
      pointList.push([x, y])
      y += 0.01
    }
    x += 0.01
  }

  return pointList;
}

function getPolygonExtentFromGeometry(polygonGeometry) {
  // console.log(polygonGeometry._polygonHierarchy.positions)
  const hierarchy = polygonGeometry._polygonHierarchy;
  const positions = hierarchy.positions;
  const ellipsoid = polygonGeometry.ellipsoid || Cesium.Ellipsoid.WGS84; // 默认 WGS84 椭球体:ml-citation{ref="7,8" data="citationList"}

  let west = 180, east = -180, south = 90, north = -90;

  positions.forEach(cartesian3 => {
    const cartographic = ellipsoid.cartesianToCartographic(cartesian3);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);

    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  });
  var pointList = []
  var x = west
  
  while (x < east) {
    var y = south
    while (y < north) {
      pointList.push([x,y])
      y += 0.001
    }
    x += 0.001
  }
  
  return pointList;
}

/**
 * 使用射线法（奇偶规则）判断点是否在多边形内部
 * @param {Array<number>} point 待判断点坐标，格式为 [x, y]
 * @param {Array<Array<number>>} polygon 多边形顶点坐标数组，格式为 [[x1,y1], [x2,y2], ...]
 * @returns {boolean} true: 点在多边形内；false: 点不在多边形内
 */
function isPointInPolygonRayCasting(point, polygon) {
  const [x, y] = point;
  let crossings = 0;

  for (let i = 0; i < polygon.length; i++) {
    const currentVertex = polygon[i];
    const nextVertex = polygon[(i + 1) % polygon.length]; // 闭合多边形：最后一个点连接第一个点

    const [x1, y1] = currentVertex;
    const [x2, y2] = nextVertex;

    // 排除水平边（射线与水平边无交点）
    if (y1 === y2) continue;

    // 确定边的上下端点，确保 y2 > y1
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);

    // 检查射线是否与边在垂直方向上重叠
    if (y > yMax || y < yMin) continue;

    // 计算射线与边的交点的 x 坐标
    const xIntersect = ((y - y1) * (x2 - x1)) / (y2 - y1) + x1;

    // 交点位于射线右侧且有效时，计数加1
    if (x <= xIntersect) {
      crossings++;
    }
  }

  // 奇数次穿越：点在内部；偶数次穿越：点在外部
  return crossings % 2 === 1;
}
//采集地形数据
async function getAllPointHeight(positions) {
  // const terrainProvider = await Cesium.createWorldTerrainAsync();
  const terrainProvider = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl("https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer", {
    token: "AAPK609af7fcb9cf4958849fcf480068447asZwSe6JgJNTu_KDzk69njW02iBtdOiZAgLAuv0r_R0q-fqsZyp5hmUjubneLo1f7"
  });
  const updatedPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
  return updatedPositions
}

//采集地形数据最高点Cesium地形
async function getMaxHeight(positions) {
  const terrainProvider = await Cesium.createWorldTerrainAsync();
  const updatedPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);

  // 遍历查找最大高程点
  let maxHeight = -Infinity;
  let maxIndex = -1;
  updatedPositions.forEach((pos, index) => {
    if (pos.height > maxHeight) {
      maxHeight = pos.height;
      maxIndex = index;
    }
  });
  const maxPoint = positions[maxIndex]
  return maxPoint
}

//采集地形数据最低点Cesium地形
async function getMinHeight(positions) {
  const terrainProvider = await Cesium.createWorldTerrainAsync();
  const updatedPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);

  // 遍历查找最大高程点
  let minHeight = Infinity;
  let minIndex = -1;
  updatedPositions.forEach((pos, index) => {
    if (pos.height < minHeight) {
      minHeight = pos.height;
      minIndex = index;
    }
  });
  const minPoint = positions[minIndex]
  return minPoint
}

//异步获取高程值
async function getElevation(jd, wd) {
  const terrainProvider = await Cesium.createWorldTerrainAsync();
  const positions = [Cesium.Cartographic.fromDegrees(jd, wd)];
  const updatedPositions = await Cesium.sampleTerrainMostDetailed(
    terrainProvider,
    positions
  );
  return updatedPositions;
}

//设置ESRI服务器terrain
async function setEsriTerrainProvider() {
  const terrainProvider = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl("https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer", {
    token: "AAPK609af7fcb9cf4958849fcf480068447asZwSe6JgJNTu_KDzk69njW02iBtdOiZAgLAuv0r_R0q-fqsZyp5hmUjubneLo1f7"
  });
  viewer.terrainProvider = terrainProvider;
}