# GeoServer REST API 接口文档

> 来源：[GeoServer 2.28.x 官方文档](https://docs-archive.geoserver.org/stable/en/user/rest/index.html)  
> GeoServer 版本：2.28.x

---

## 概述

GeoServer 提供 RESTful 接口，客户端无需使用 Web 管理界面，即可通过简单的 HTTP 请求检索服务器信息并进行配置变更。

**HTTP 方法语义：**

| 方法 | 用途 |
|------|------|
| `GET` | 读取数据（查询） |
| `POST` | 创建新资源 |
| `PUT` | 更新已有资源（**部分更新**，仅修改传入字段，其余字段保持不变） |
| `DELETE` | 删除资源 |

**认证方式：** HTTP Basic Auth  
**请求示例基础 URL：** `http://localhost:8080/geoserver/rest`

---

## 一、服务器信息（About）

### 获取版本信息

```
GET /rest/about/version.xml
GET /rest/about/version.json
```

响应示例（XML）：
```xml
<about>
  <resource name="GeoServer">
    <Version>2.28.x</Version>
    <Git-Revision>e66f8da...</Git-Revision>
    <Build-Timestamp>11-Dec-2012 17:55</Build-Timestamp>
  </resource>
  <resource name="GeoTools">...</resource>
  <resource name="GeoWebCache">...</resource>
</about>
```

### 获取系统状态

```
GET /rest/about/system-status
GET /rest/about/system-status.json
GET /rest/about/system-status.xml
```

返回 CPU、内存、磁盘等系统监控指标，每条指标包含 `name`、`available`、`description`、`unit`、`category`、`priority`、`identifier` 字段。

### 获取 Manifest（依赖清单）

```
GET /rest/about/manifest.xml
GET /rest/about/manifest.xml?manifest=gwc-.*         # 按名称过滤
GET /rest/about/manifest.xml?key=GeoServerModule      # 按属性过滤
GET /rest/about/manifest.xml?key=GeoServerModule&value=extension  # 按属性+值过滤
```

---

## 二、配置重载与缓存重置

### 重新加载配置（不重启服务）

```
POST /rest/reload
```

```js
$.ajax({
  url: "http://localhost:8080/geoserver/rest/reload",
  method: "POST",
  headers: { Authorization: "Basic " + btoa("admin:geoserver") }
});
```

### 重置缓存

```
POST /rest/reset
```

---

## 三、工作空间（Workspaces）

### 获取所有工作空间

```
GET /rest/workspaces.json
GET /rest/workspaces.xml
```

### 获取指定工作空间详情

```
GET /rest/workspaces/{ws}.json
GET /rest/workspaces/{ws}.xml
```

响应示例（XML）：
```xml
<workspace>
  <name>acme</name>
  <dataStores>...</dataStores>
  <coverageStores>...</coverageStores>
  <wmsStores>...</wmsStores>
</workspace>
```

### 创建工作空间

```
POST /rest/workspaces
Content-Type: text/xml

<workspace><name>acme</name></workspace>
```

响应：`201 Created`

### 删除工作空间

```
DELETE /rest/workspaces/{ws}
DELETE /rest/workspaces/{ws}?recurse=true    # 同时删除其下所有资源
```

---

## 四、命名空间（Namespaces）

### 获取所有命名空间

```
GET /rest/namespaces.json
```

### 获取指定命名空间

```
GET /rest/namespaces/{ns}.json
```

---

## 五、数据存储（DataStores，矢量）

### 获取工作空间下所有数据存储

```
GET /rest/workspaces/{ws}/datastores.json
```

### 获取指定数据存储详情

```
GET /rest/workspaces/{ws}/datastores/{ds}.xml
```

### 上传 Shapefile 并创建存储

```
PUT /rest/workspaces/{ws}/datastores/{storeName}/file.shp
Content-Type: application/zip
Body: <roads.zip 二进制>
```

响应：`201 Created`

### 添加已有 Shapefile（服务器本地路径）

```
PUT /rest/workspaces/{ws}/datastores/{storeName}/external.shp
Content-Type: text/plain
Body: file:///data/shapefiles/rivers/rivers.shp
```

### 添加 PostGIS 数据库存储

```
POST /rest/workspaces/{ws}/datastores
Content-Type: text/xml

<dataStore>
  <name>nyc</name>
  <connectionParameters>
    <host>localhost</host>
    <port>5432</port>
    <database>nyc</database>
    <user>bob</user>
    <passwd>postgres</passwd>
    <dbtype>postgis</dbtype>
  </connectionParameters>
</dataStore>
```

### 删除数据存储

```
DELETE /rest/workspaces/{ws}/datastores/{ds}?recurse=true
```

---

## 六、要素类型（FeatureTypes，矢量图层）

### 获取数据存储下的矢量图层列表

```
GET /rest/workspaces/{ws}/datastores/{ds}/featuretypes.json
```

### 获取指定矢量图层详情

```
GET /rest/workspaces/{ws}/datastores/{ds}/featuretypes/{ft}.xml
```

### 从 PostGIS 表发布矢量图层

```
POST /rest/workspaces/{ws}/datastores/{ds}/featuretypes
Content-Type: text/xml

<featureType><name>buildings</name></featureType>
```

### 创建 PostGIS 表并发布图层

```
POST /rest/workspaces/{ws}/datastores/{ds}/featuretypes
Content-Type: text/xml

<featureType>
  <name>annotations</name>
  <srs>EPSG:4326</srs>
  <attributes>
    <attribute>
      <name>the_geom</name>
      <binding>org.locationtech.jts.geom.Point</binding>
    </attribute>
    <attribute>
      <name>description</name>
      <binding>java.lang.String</binding>
    </attribute>
  </attributes>
</featureType>
```

---

## 七、栅格数据存储（CoverageStores）

### 获取工作空间下所有栅格存储

```
GET /rest/workspaces/{ws}/coveragestores.json
```

### 获取指定栅格存储详情

```
GET /rest/workspaces/{ws}/coveragestores/{cs}.json
```

### 创建栅格存储

```
POST /rest/workspaces/{ws}/coveragestores
Content-Type: text/xml

<coverageStore>
  <name>my_raster</name>
  <workspace>WMS_DOM</workspace>
  <enabled>true</enabled>
  <type>GeoTIFF</type>
  <url>file:data/my_raster.tif</url>
</coverageStore>
```

### 删除栅格存储

```
DELETE /rest/workspaces/{ws}/coveragestores/{cs}?recurse=true
```

---

## 八、栅格图层（Coverages）

### 获取栅格存储下的图层列表

```
GET /rest/workspaces/{ws}/coveragestores/{cs}/coverages.json
```

### 发布栅格图层

```
POST /rest/workspaces/{ws}/coveragestores/{cs}/coverages
Content-Type: text/xml

<coverage>
  <name>my_layer</name>
  <nativeName>my_raster</nativeName>
</coverage>
```

---

## 九、图层（Layers）

### 获取所有图层

```
GET /rest/layers.json
GET /rest/layers.xml
```

响应示例（JSON）：
```json
{
  "layers": {
    "layer": [
      { "name": "giant_polygon", "href": "http://localhost:8080/geoserver/rest/layers/giant_polygon.json" },
      { "name": "poi", "href": "http://localhost:8080/geoserver/rest/layers/poi.json" }
    ]
  }
}
```

### 获取指定图层详情

```
GET /rest/layers/{layerName}.json
GET /rest/layers/{ws}:{layerName}.json
```

### 修改图层配置（如更改默认样式）

```
PUT /rest/layers/{ws}:{layerName}
Content-Type: text/xml

<layer>
  <defaultStyle>
    <name>new_style</name>
  </defaultStyle>
</layer>
```

### 删除图层

```
DELETE /rest/layers/{ws}:{layerName}
```

---

## 十、图层组（LayerGroups）

### 获取所有图层组

```
GET /rest/layergroups.json
```

### 创建图层组

```
POST /rest/layergroups
Content-Type: text/xml

<layerGroup>
  <name>nyc</name>
  <layers>
    <layer>roads</layer>
    <layer>parks</layer>
    <layer>buildings</layer>
  </layers>
  <styles>
    <style>roads_style</style>
    <style>polygon</style>
    <style>polygon</style>
  </styles>
</layerGroup>
```

响应：`201 Created`

> 可通过 WMS 预览：`http://localhost:8080/geoserver/wms/reflect?layers=nyc`

### 修改图层组

```
PUT /rest/layergroups/{lg}
Content-Type: text/xml
```

### 删除图层组

```
DELETE /rest/layergroups/{lg}
```

---

## 十一、样式（Styles）

### 获取所有样式

```
GET /rest/styles.json
```

### 获取工作空间下的样式

```
GET /rest/workspaces/{ws}/styles.json
```

### 下载样式 SLD 文件

```
GET /rest/styles/{styleName}.sld
```

### 创建样式（两步法）

**第一步：注册样式条目**
```
POST /rest/styles
Content-Type: text/xml

<style><name>roads_style</name><filename>roads.sld</filename></style>
```

**第二步：上传 SLD 内容**
```
PUT /rest/styles/roads_style
Content-Type: application/vnd.ogc.sld+xml
Body: <SLD 文件内容>
```

### 创建样式（ZIP 一步法）

```
POST /rest/styles
Content-Type: application/zip
Body: <包含 SLD 和图片的 zip 文件>
```

### 创建 CSS 样式

```
POST /rest/styles
Content-Type: application/vnd.geoserver.geocss+css
Body: * { stroke: red; }
```

### 更新已有样式

```
PUT /rest/styles/{styleName}
Content-Type: application/vnd.ogc.sld+xml
Body: <新 SLD 内容>
```

更新工作空间下的样式：
```
PUT /rest/workspaces/{ws}/styles/{styleName}
Content-Type: application/vnd.ogc.sld+xml
```

### 删除样式

```
DELETE /rest/styles/{styleName}                # 仅删除注册条目
DELETE /rest/styles/{styleName}?purge=true     # 同时删除 SLD 文件
```

---

## 十二、WMS/WMTS 级联存储

### 获取 WMS 存储列表

```
GET /rest/workspaces/{ws}/wmsstores.json
```

### 获取 WMTS 存储列表

```
GET /rest/workspaces/{ws}/wmtsstores.json
```

### 创建外部 WMTS 存储

```
POST /rest/workspaces/{ws}/wmtsstores
Content-Type: text/xml

<wmtsStore>
  <name>basemap-nat-geo-datastore</name>
  <description>esri-street-map</description>
  <capabilitiesURL>https://services.arcgisonline.com/.../WMTSCapabilities.xml</capabilitiesURL>
  <type>WMTS</type>
</wmtsStore>
```

### 发布 WMTS 图层

```
POST /rest/workspaces/{ws}/wmtsstores/{storeName}/layers
Content-Type: text/xml

<wmtsLayer><name>NatGeo_World_Map</name></wmtsLayer>
```

---

## 十三、安全配置（Security）

### 获取主密钥

```
GET /rest/security/masterpw.xml
```

### 修改主密钥

```
PUT /rest/security/masterpw.xml
Content-Type: text/xml

<masterPassword>
  <oldMasterPassword>旧密码</oldMasterPassword>
  <newMasterPassword>新密码</newMasterPassword>
</masterPassword>
```

### 获取目录访问模式

```
GET /rest/security/acl/catalog.xml
```

响应：`<catalog><mode>HIDE</mode></catalog>`（模式可为 `HIDE` / `MIXED` / `CHALLENGE`）

### 修改目录访问模式

```
PUT /rest/security/acl/catalog.xml
Content-Type: text/xml

<catalog><mode>MIXED</mode></catalog>
```

### 获取访问控制规则

```
GET /rest/security/acl/layers.xml
```

### 添加访问控制规则

```
POST /rest/security/acl/layers.xml
Content-Type: text/xml

<rules>
  <rule resource="topp.*.r">ROLE_AUTHORIZED</rule>
  <rule resource="topp.mylayer.w">ROLE_1,ROLE_2</rule>
</rules>
```

### 删除访问控制规则

```
DELETE /rest/security/acl/layers/topp.*.r
```

---

## 十四、GeoWebCache（缓存管理）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/gwc/rest/layers.json` | 获取缓存图层列表 |
| GET | `/gwc/rest/gridsets.json` | 获取所有网格集 |
| POST | `/gwc/rest/reload` | 重新加载 GeoWebCache 配置 |
| POST | `/gwc/rest/masstruncate` | 批量清除缓存 |
| POST | `/gwc/rest/seed/{layerName}` | 预生成瓦片缓存 |
| GET | `/gwc/rest/diskquota.json` | 获取磁盘配额设置 |
| PUT | `/gwc/rest/diskquota` | 修改磁盘配额设置 |

---

## 十五、前端 jQuery 调用示例

```js
const GEO = "http://127.0.0.1:8080/geoserver";
const AUTH = { Authorization: "Basic " + btoa("admin:你的密码") };

// 获取所有工作空间
$.ajax({ url: `${GEO}/rest/workspaces.json`, headers: AUTH,
  success: res => console.log(res) });

// 获取所有图层
$.ajax({ url: `${GEO}/rest/layers.json`, headers: AUTH,
  success: res => console.log(res) });

// 获取指定工作空间的栅格存储
$.ajax({ url: `${GEO}/rest/workspaces/WMS_DOM/coveragestores.json`, headers: AUTH,
  success: res => console.log(res) });

// 重新加载配置
$.ajax({ url: `${GEO}/rest/reload`, method: "POST", headers: AUTH });

// 更新图层默认样式
$.ajax({
  url: `${GEO}/rest/layers/WMS_DOM:sc_4326_imagesomaic`,
  method: "PUT",
  headers: { ...AUTH, "Content-Type": "text/xml" },
  data: `<layer><defaultStyle><name>my_style</name></defaultStyle></layer>`
});
```

---

## 附：响应格式说明

大多数接口支持 `.json` 和 `.xml` 两种响应格式，在 URL 末尾加后缀或通过 `Accept` 请求头指定：

```
GET /rest/workspaces.json          # JSON 格式
GET /rest/workspaces.xml           # XML 格式

# 或使用 Accept 头
Accept: application/json
Accept: text/xml
```

---

*文档整理自 GeoServer 2.28.x 官方手册，完整 API 参考：https://docs-archive.geoserver.org/stable/en/user/rest/index.html*
