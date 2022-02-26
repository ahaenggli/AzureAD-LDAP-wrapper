'use strict';

(function() {
    let strings = ["z"];
    try {
        while(true) {
            strings.push(strings[strings.length - 1] + strings[strings.length - 1]);
        }
    } catch(err) {
        var k = strings.length - 2;
        while(k >= 0) {
            try {
                strings.push(strings[strings.length - 1] + strings[k]);
                k--;
            } catch(err) {}
        }
        console.log("The maximum string length is " + strings[strings.length - 1].length);
    }
})();