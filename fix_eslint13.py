with open('/app/js/main.js', 'r') as f:
    js = f.read()

# I see a parsing error at the very end of main.js again
js = js.replace('else init();', 'else init();\n})();')
with open('/app/js/main.js', 'w') as f:
    f.write(js)
