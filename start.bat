@echo off 

if "%1"=="h" goto begin 

start mshta vbscript:createobject("wscript.shell").run("""%~nx0"" h",0)(window.close)&&exit 

:begin 
start /b sbtcd.exe --datadir=./block
