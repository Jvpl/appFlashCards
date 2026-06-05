@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo Compilando APK (apenas arm64-v8a para build local rapido)...
cd android
call gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a
if errorlevel 1 (
    echo Erro na compilacao.
    pause
    exit /b 1
)
cd ..

echo Copiando para APK Build...
copy "android\app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\Desktop\APK Build\app-debug.apk"

echo Pronto! APK disponivel em: %USERPROFILE%\Desktop\APK Build\app-debug.apk
pause
