var fs = require("fs");

var resourceFiles = [
	/* localization */
	"resources/localization.tsv",
	/* bitsy game data */
	"resources/defaultGameData.bitsy",
	/* bitsy fonts */
	"resources/bitsyfont/ascii_small.bitsyfont",
	"resources/bitsyfont/unicode_european_small.bitsyfont",
	"resources/bitsyfont/unicode_european_large.bitsyfont",
	"resources/bitsyfont/unicode_asian.bitsyfont",
	"resources/bitsyfont/arabic.bitsyfont",
	/* export */
	"resources/export/exportTemplate.html",
	"resources/export/exportStyleFixed.css",
	"resources/export/exportStyleFull.css",
	/* engine scripts */
	"../editor/script/engine/bitsy.js",
	"../editor/script/engine/font.js",
	"../editor/script/engine/dialog.js",
	"../editor/script/engine/script.js",
	"../editor/script/engine/color_util.js",
	"../editor/script/engine/renderer.js",
	"../editor/script/engine/transition.js",
	/* 3d hack and dependencies*/
	"../editor/libs/babylon.js",
	"../editor/script/3d/bitsy3d.js",
];

var resourceDirectories = [
	"resources/icons",
];

var resourcePackage = {};

function getFileName(path) {
	var splitPath = path.split("/");
	return splitPath[splitPath.length - 1];
}

for (var i = 0; i < resourceFiles.length; i++) {
	var path = resourceFiles[i];
	var fileName = getFileName(path);
	var result = fs.readFileSync(path, "utf8");
	resourcePackage[fileName] = result;
}

for (var i = 0; i < resourceDirectories.length; i++) {
	var dir = resourceDirectories[i];
	var fileNames = fs.readdirSync(dir);
	for (var j = 0; j < fileNames.length; j++) {
		var fileName = fileNames[j];
		var result = fs.readFileSync(dir + "/" + fileName, "utf8");
		resourcePackage[fileName] = result;
	}
}

var resourceJavascriptFile = "var Resources = " + JSON.stringify(resourcePackage, null, 2) + ";";

//we have no idea why this turns out differently on everyone elses machines, but inorder to work on ours we need this
while (resourceJavascriptFile.indexOf('\\r\\n') != -1 ) {
    var temp = resourceJavascriptFile.replace(/\\r\\n/g, '\\n');
    resourceJavascriptFile = temp;
}

fs.writeFile("../editor/script/generated/resources.js", resourceJavascriptFile, function () {});

// console.debug(resourcePackage);

console.debug("done!");