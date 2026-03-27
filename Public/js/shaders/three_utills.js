const vs1 = `
                varying vec3 vColor;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    vColor = color;
                    vNormal = normalize(normalMatrix * normal);
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `;
const fs1 = `
                uniform float blackThreshold;
                uniform float opacity;
                varying vec3 vColor;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    // 简单光照计算
                    vec3 normal = normalize(vNormal);
                    vec3 viewDirection = normalize(vViewPosition);
                    // 环境光
                    vec3 ambient = vColor * 0.4;
                    // 漫反射光（简单定向光）
                    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
                    float diffuseStrength = max(dot(normal, lightDirection), 0.0);
                    vec3 diffuse = vColor * diffuseStrength * 0.6;
                    
                    // 组合颜色
                    gl_FragColor = vec4(ambient + diffuse, 1.0);
                }
            `;

const fs2 = `

                uniform float c_r;
                uniform float c_g;
                uniform float c_b;
                uniform float opacity;
                varying vec3 vColor;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    float epsilon = 0.1;
                    // 检测黑色 - 如果所有颜色分量都小于阈值，则设置为透明
                    if (abs(vColor.r - c_r) < epsilon && abs(vColor.g - c_g) < epsilon && abs(vColor.b - c_b) < epsilon) {
                        discard;
                    }
                    
                    // 简单光照计算
                    vec3 normal = normalize(vNormal);
                    vec3 viewDirection = normalize(vViewPosition);
                    
                    // 环境光
                    vec3 ambient = vColor * 0.4;
                    
                    // 漫反射光（简单定向光）
                    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
                    float diffuseStrength = max(dot(normal, lightDirection), 0.0);
                    vec3 diffuse = vColor * diffuseStrength * 0.6;
                    
                    // 组合颜色
                    gl_FragColor = vec4(ambient + diffuse, opacity);
                }
            `;


const vs2 = `
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal; // 新增：世界空间法线

void main() {
    vColor = color;
    vNormal = normalize(normalMatrix * normal);
    
    // 计算世界空间法线
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fs3 = `
uniform float c_r;
uniform float c_g;
uniform float c_b;
uniform float opacity;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal; // 需要在顶点着色器中计算并传递

void main() {
    float epsilon = 0.01;
    
    // 检测黑色 - 如果所有颜色分量都小于阈值，则设置为透明
    if (abs(vColor.r - c_r) < epsilon && 
        abs(vColor.g - c_g) < epsilon && 
        abs(vColor.b - c_b) < epsilon) {
        discard;
    }
    
    // 检测法线方向 - 如果法线主要在XZ平面内(Y分量接近0)，则不显示
    // 使用世界空间法线，确保不随相机变化
    float verticalThreshold = 0.1; // 调整这个值来控制过滤的严格程度
    
    // 使用绝对Y分量来判断是否在XZ平面内
    if (abs(vWorldNormal.y) < verticalThreshold) {
        discard;
    }
    
    // 简单光照计算（仍然使用视图空间法线进行光照计算）
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewPosition);
    
    // 环境光
    vec3 ambient = vColor * 0.2;
    
    // 漫反射光（简单定向光）
    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
    float diffuseStrength = max(dot(normal, lightDirection), 0.0);
    vec3 diffuse = vColor * diffuseStrength * 0.6;
    
    // 组合颜色
    gl_FragColor = vec4(ambient + diffuse, opacity);
}
`;

const vs4 =
    `
    attribute float elevation;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying float vElevation;

    void main() {
        vColor = color;
        vNormal = normalize(normalMatrix * normal);
        vElevation = elevation;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`

const fs4 =
    `
    varying float vElevation;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
        if(vElevation < 1000.0){
            discard;
        }
        
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 ambient = vColor * 0.4;
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float diffuseStrength = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = vColor * diffuseStrength * 0.6;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
    }
`

const vs5 =
    `
    attribute float elevation;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        if (abs(elevation) < 0.0001) {
            gl_Position = vec4(0.0, 0.0, 10000.0, 0.0);
            return;
        }

        vColor = color;
        vNormal = normalize(normalMatrix * normal);

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`

const fs5 =
    `
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 ambient = vColor * 0.4;
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float diffuseStrength = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = vColor * diffuseStrength * 0.6;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
    }
`

const vs6 =
    `
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        vColor = color;
        vNormal = normalize(normalMatrix * normal);

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`

const fs6 =
    `
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 ambient = vColor * 0.4;
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float diffuseStrength = max(dot(normal, lightDirection), 0.0);
        vec3 diffuse = vColor * diffuseStrength * 0.6;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
    }
`

function calculateJValues(width, height) {
    const totalI = (width + 1) * (height + 1);
    for (let i = 0; i < totalI; i++) {
        const row = Math.floor(i / (width + 1));
        const col = i % (width + 1);
        
        let j;
        if (col === 0) {
            j = row * 2; // 0, 2, 4, 6...
        } else if (col % 2 === 1) {
            j = row * 2 + 1; // 1, 3, 5, 7...
        } else {
            j = row * 2 + 1; // 1, 3, 5, 7...（与奇数位置相同）
        }
        
        console.log(i,j)
    }
    
}