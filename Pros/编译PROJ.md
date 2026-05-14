# 以前已经准备好vcpkg环境：D:\GDAL\vcpkg-master


1. 进入你的 vcpkg 目录：---cd D:\GDAL\vcpkg-master
2. 执行安装命令（假设我们要编译的是 64 位程序）：.\vcpkg install sqlite3:x64-windows tiff:x64-windows
3. 进入D:\GDAL\dev\PROJ\PROJ-master，删除原来的build_Re,重建一个build_Re文件夹
4. 建立工程： cmake .. -DCMAKE_TOOLCHAIN_FILE="D:\GDAL\vcpkg-master\scripts\buildsystems\vcpkg.cmake" -DCMAKE_POLICY_VERSION_MINIMUM=3.5
5. 编译：cmake --build . --config Release -j 8