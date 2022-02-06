var JSZip = require("jszip");

var promises = require("./promises");

exports.openArrayBuffer = openArrayBuffer;
exports.splitPath = splitPath;
exports.joinPath = joinPath;

function openArrayBuffer(arrayBuffer) {

    var jszip = new JSZip();
    return jszip.loadAsync(arrayBuffer).then(function(zipFile) {
        function exists(name) {
            return zipFile.file(name) !== null;
        }

        function read(name, encoding) {
            // var array = zipFile.file(name).asUint8Array();
            return zipFile.file(name).async("uint8array").then(function(array) {
                var buffer = uint8ArrayToBuffer(array);
                if (encoding) {
                    // return promises.when(buffer.toString(encoding));
                    return buffer.toString(encoding);
                } else {
                    // return promises.when(buffer);
                    return buffer;
                }
            });
        }

        function write(name, contents) {
            zipFile.file(name, contents);
        }

        function toBuffer() {
            // return zipFile.generate({type: "nodebuffer"});
            return zipFile.generateAsync({type: "nodebuffer"}).then(function(content) {
                return content;
            });
        }

        return {
            exists: exists,
            read: read,
            write: write,
            toBuffer: toBuffer
        };
    });
    // var zipFile = new JSZip(arrayBuffer);
}

function uint8ArrayToBuffer(array) {
    if (Buffer.from && Buffer.from !== Uint8Array.from) {
        return Buffer.from(array);
    } else {
        return new Buffer(array);
    }
}

function splitPath(path) {
    var lastIndex = path.lastIndexOf("/");
    if (lastIndex === -1) {
        return {dirname: "", basename: path};
    } else {
        return {
            dirname: path.substring(0, lastIndex),
            basename: path.substring(lastIndex + 1)
        };
    }
}

function joinPath() {
    var nonEmptyPaths = Array.prototype.filter.call(arguments, function(path) {
        return path;
    });

    var relevantPaths = [];

    nonEmptyPaths.forEach(function(path) {
        if (/^\//.test(path)) {
            relevantPaths = [path];
        } else {
            relevantPaths.push(path);
        }
    });

    return relevantPaths.join("/");
}
