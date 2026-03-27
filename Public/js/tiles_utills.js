async function stitchTilesWithPosition(tiles, tileSize = 256) {
    if (tiles.length === 0) throw new Error('瓦片数组为空');
    
    const bounds = calculateBounds(tiles);
    const canvasWidth = (bounds.maxCol - bounds.minCol + 1) * tileSize;
    const canvasHeight = (bounds.maxRow - bounds.minRow + 1) * tileSize;
    
    // const canvas = document.createElement('canvas');
    const canvas = $('#canvas1')[0]
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // 清空背景
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 并行加载所有图片
    const loadPromises = tiles.map(tile => 
        loadImage(tile.url).catch(error => {
            console.error(`加载瓦片失败: ${tile.url}`, error);
            return null;
        })
    );
    
    const images = await Promise.all(loadPromises);
    
    // 绘制所有图片
    images.forEach((img, index) => {
        if (img) {
            const tile = tiles[index];
            const x = (tile.col - bounds.minCol) * tileSize;
            const y = (tile.row - bounds.minRow) * tileSize;
            
            ctx.drawImage(img, x, y, tileSize, tileSize);
        } else {
            // 绘制错误占位符
            const tile = tiles[index];
            const x = (tile.col - bounds.minCol) * tileSize;
            const y = (tile.row - bounds.minRow) * tileSize;
            drawErrorTile(ctx, x, y, tileSize);
        }
    });
    
    return {
        canvas,
        bounds,
        tileSize
    };
}

function loadImage(url, timeout = 10000) {
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

async function downloadWithFilePicker(canvas, filename = 'image.png') {
    try {
        // 转换为Blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        // 使用文件选择器API
        const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
                description: 'PNG Image',
                accept: { 'image/png': ['.png'] }
            }]
        });
        
        // 写入文件
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        console.log('文件保存成功');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('保存失败:', error);
            // 降级到传统方式
            downloadCanvasAsBlob(canvas, filename);
        }
    }
}