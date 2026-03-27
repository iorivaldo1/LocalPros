/*
 * @Description: 轨迹球体效果（参考开源代码）
 * @Version: 1.0
 * @Author: Julian
 * @Date: 2022-03-04 16:50:58
 * @LastEditors: Julian
 * @LastEditTime: 2022-03-04 17:06:56
 */
class EllipsoidTrailMaterialProperty2 {
  constructor(options) {
    this._definitionChanged = new Cesium.Event();
    this._color = undefined;
    this._speed = undefined;
    this.color = options.color;
    this.speed = options.speed;
  }

  get isConstant() {
    return false;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType(time) {
    return Cesium.Material.t;
  }

  getValue(time, result) {
    if (!Cesium.defined(result)) {
      result = {};
    }

    result.color = Cesium.Property.getValueOrDefault(
      this._color,
      time,
      Cesium.Color.RED,
      result.color
    );
    result.speed = Cesium.Property.getValueOrDefault(
      this._speed,
      time,
      10,
      result.speed
    );
    return result;
  }

  equals(other) {
    return (
      this === other ||
      (other instanceof EllipsoidTrailMaterialProperty2 &&
        Cesium.Property.equals(this._color, other._color) &&
        Cesium.Property.equals(this._speed, other._speed))
    );
  }
}

Object.defineProperties(EllipsoidTrailMaterialProperty2.prototype, {
  color: Cesium.createPropertyDescriptor("color"),
  speed: Cesium.createPropertyDescriptor("speed"),
});

Cesium.EllipsoidTrailMaterialProperty2 = EllipsoidTrailMaterialProperty2;
Cesium.Material.EllipsoidTrailMaterialProperty2 =
  "EllipsoidTrailMaterialProperty2";
Cesium.Material.t = "t";
Cesium.Material.s = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    float time = fract(czm_frameNumber * speed / 10000.0);
    float val = step(time,st.t);

    material.alpha = val;
    material.diffuse = color.rgb;
    return material;
}
`;

Cesium.Material._materialCache.addMaterial(Cesium.Material.t, {
  fabric: {
    type: Cesium.Material.t,
    uniforms: {
      color: new Cesium.Color(0.0, 1.0, 0.0, 1.0),
      speed: 10.0,
    },
    source: Cesium.Material.s,
  },
  translucent: function (material) {
    return true;
  },
});
