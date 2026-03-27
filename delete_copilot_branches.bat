@echo off
cd /d D:\前端\LocalPros
echo Listing all worktrees...
git worktree list

echo.
echo Listing all branches...
git branch -a

echo.
echo Removing copilot worktrees...
for /f "tokens=1" %%i in ('git worktree list ^| findstr /i "copilot"') do (
    echo Removing worktree: %%i
    git worktree remove "%%i" --force
)

echo.
echo Deleting local copilot branches...
for /f "tokens=*" %%i in ('git branch ^| findstr /i "copilot"') do (
    set branch=%%i
    set branch=!branch:~2!
    echo Deleting branch: !branch!
    git branch -D "!branch!"
)

echo.
echo Deleting remote copilot branches...
for /f "tokens=*" %%i in ('git branch -r ^| findstr /i "copilot"') do (
    echo Deleting remote branch: %%i
    git push origin --delete %%i
)

echo.
echo Done!
pause
