function Script() {

this.CreateInterpreter = function() {
	return new Interpreter();
};

this.CreateUtils = function() {
	return new Utils();
};

var Interpreter = function() {
	var env = new Environment();
	var parser = new Parser( env );

	this.SetDialogBuffer = function(buffer) { env.SetDialogBuffer( buffer ); };

	// TODO -- maybe this should return a string instead othe actual script??
	this.Compile = function(scriptName, scriptStr) {
		// console.debug("COMPILE");
		var script = parser.Parse(scriptStr, scriptName);
		env.SetScript(scriptName, script);
	}
	this.Run = function(scriptName, exitHandler, objectContext) { // Runs pre-compiled script
		var localEnv = new LocalEnvironment(env);

		if (objectContext) {
			localEnv.SetObject(objectContext); // PROTO : should this be folded into the constructor?
		}

		var script = env.GetScript(scriptName);

		script.Eval( localEnv, function(result) { OnScriptReturn(localEnv, exitHandler); } );
	}
	this.Interpret = function(scriptStr, exitHandler, objectContext) { // Compiles and runs code immediately
		// console.debug("INTERPRET");
		var localEnv = new LocalEnvironment(env);

		if (objectContext) {
			localEnv.SetObject(objectContext); // PROTO : should this be folded into the constructor?
		}

		var script = parser.Parse(scriptStr, "anonymous");
		script.Eval( localEnv, function(result) { OnScriptReturn(localEnv, exitHandler); } );
	}
	this.HasScript = function(name) { return env.HasScript(name); };

	this.ResetEnvironment = function() {
		env = new Environment();
		parser = new Parser( env );
	}

	this.Parse = function(scriptStr, rootId) { // parses a script but doesn't save it
		return parser.Parse(scriptStr, rootId);
	}

	// TODO : add back in if needed later...
	// this.CompatibilityParse = function(scriptStr, compatibilityFlags) {
	// 	env.compatibilityFlags = compatibilityFlags;

	// 	var result = parser.Parse(scriptStr);

	// 	delete env.compatibilityFlags;

	// 	return result;
	// }

	this.Eval = function(scriptTree, exitHandler) { // runs a script stored externally
		var localEnv = new LocalEnvironment(env); // TODO : does this need an object context?
		scriptTree.Eval(
			localEnv,
			function(result) {
				OnScriptReturn(result, exitHandler);
			});
	}

	function OnScriptReturn(result, exitHandler) {
		if (exitHandler != null) {
			exitHandler(result);
		}
	}

	this.CreateExpression = function(expStr) {
		return parser.CreateExpression(expStr);
	}

	this.SetVariable = function(name,value,useHandler) {
		env.SetVariable(name,value,useHandler);
	}

	this.DeleteVariable = function(name,useHandler) {
		env.DeleteVariable(name,useHandler);
	}
	this.HasVariable = function(name) {
		return env.HasVariable(name);
	}

	this.SetOnVariableChangeHandler = function(onVariableChange) {
		env.SetOnVariableChangeHandler(onVariableChange);
	}
	this.GetVariableNames = function() {
		return env.GetVariableNames();
	}
	this.GetVariable = function(name) {
		return env.GetVariable(name);
	}

	function DebugVisualizeScriptTree(scriptTree) {
		var printVisitor = {
			Visit : function(node,depth) {
				console.debug("-".repeat(depth) + "- " + node.ToString());
			},
		};

		scriptTree.VisitAll( printVisitor );
	}

	this.DebugVisualizeScriptTree = DebugVisualizeScriptTree;

	this.DebugVisualizeScript = function(scriptName) {
		DebugVisualizeScriptTree(env.GetScript(scriptName));
	}
}


var Utils = function() {
	// for editor ui
	this.CreateDialogBlock = function(children,doIndentFirstLine) {
		if (doIndentFirstLine === undefined) {
			doIndentFirstLine = true;
		}

		var block = new DialogBlockNode(doIndentFirstLine);

		for (var i = 0; i < children.length; i++) {
			block.AddChild(children[i]);
		}
		return block;
	}

	this.CreateOptionBlock = function() {
		var block = new DialogBlockNode(false);
		block.AddChild(new FuncNode("print", [new LiteralNode(" ")]));
		return block;
	}

	this.CreateItemConditionPair = function() {
		var itemFunc = this.CreateFunctionBlock("item", ["0"]);
		var condition = new ExpNode("==", itemFunc, new LiteralNode(1));
		var result = new DialogBlockNode(true);
		result.AddChild(new FuncNode("print", [new LiteralNode(" ")]));
		var conditionPair = new ConditionPairNode(condition, result);
		return conditionPair;
	}

	this.CreateVariableConditionPair = function() {
		var varNode = this.CreateVariableNode("a");
		var condition = new ExpNode("==", varNode, new LiteralNode(1));
		var result = new DialogBlockNode(true);
		result.AddChild(new FuncNode("print", [new LiteralNode(" ")]));
		var conditionPair = new ConditionPairNode(condition, result);
		return conditionPair;
	}

	this.CreateDefaultConditionPair = function() {
		var condition = this.CreateElseNode();
		var result = new DialogBlockNode(true);
		result.AddChild(new FuncNode("print", [new LiteralNode(" ")]));
		var conditionPair = new ConditionPairNode(condition, result);
		return conditionPair;
	}

	this.CreateEmptyPrintFunc = function() {
		return new FuncNode("print", [new LiteralNode("...")]);
	}

	this.CreateFunctionBlock = function(name, initParamValues) {
		var parameters = [];
		for (var i = 0; i < initParamValues.length; i++) {
			parameters.push(new LiteralNode(initParamValues[i]));
		}

		var node = new FuncNode(name, parameters);
		var block = new CodeBlockNode();
		block.AddChild(node);
		return block;
	}

	// TODO : rename ParseStringToLiteralNode?
	this.CreateLiteralNode = function(str) {
		if (str === "true") {
			return new LiteralNode(true);
		}
		else if (str === "false") {
			return new LiteralNode(false);
		}
		else if (!isNaN(parseFloat(str))) {
			return new LiteralNode(parseFloat(str));
		}
		else {
			return new LiteralNode(str);
		}
	}

	this.CreateVariableNode = function(variableName) {
		return new VarNode(variableName);
	}

	this.CreatePropertyNode = function(propertyName, literalValue) {
		var varNode = new VarNode(propertyName);
		var valNode = new LiteralNode(literalValue);
		var node = new FuncNode("property", [varNode, valNode]);
		var block = new CodeBlockNode();
		block.AddChild(node);
		return block;
	}

	this.CreateElseNode = function() {
		return new ElseNode();
	}

	this.CreateStringLiteralNode = function(str) {
		return new LiteralNode(str);
	}

	// TODO : need to split up code & dialog blocks :|
	this.CreateCodeBlock = function() {
		return new CodeBlockNode();
	}

	this.ChangeSequenceType = function(oldSequence, type) {
		if(type === "sequence") {
			return new SequenceNode(oldSequence.children);
		}
		else if(type === "cycle") {
			return new CycleNode(oldSequence.children);
		}
		else if(type === "shuffle") {
			return new ShuffleNode(oldSequence.children);
		}
		return oldSequence;
	}

	this.CreateSequenceBlock = function() {
		var option1 = new DialogBlockNode( false /*doIndentFirstLine*/ );
		option1.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var option2 = new DialogBlockNode( false /*doIndentFirstLine*/ );
		option2.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var sequence = new SequenceNode( [ option1, option2 ] );
		var block = new CodeBlockNode();
		block.AddChild( sequence );
		return block;
	}

	this.CreateCycleBlock = function() {
		var option1 = new DialogBlockNode( false /*doIndentFirstLine*/ );
		option1.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var option2 = new DialogBlockNode( false /*doIndentFirstLine*/ );
		option2.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var sequence = new CycleNode( [ option1, option2 ] );
		var block = new CodeBlockNode();
		block.AddChild( sequence );
		return block;
	}

	this.CreateShuffleBlock = function() {
		var option1 = new DialogBlockNode( false /*doIndentFirstLine*/ );
		option1.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var option2 = new DialogBlockNode( false /*doIndentFirstLine*/ );
		option2.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var sequence = new ShuffleNode( [ option1, option2 ] );
		var block = new CodeBlockNode();
		block.AddChild( sequence );
		return block;
	}

	this.CreateIfBlock = function() {
		var leftNode = new CodeBlockNode();
		leftNode.AddChild( new FuncNode("item", [new LiteralNode("0")] ) );
		var rightNode = new LiteralNode( 1 );
		var condition1 = new ExpNode("==", leftNode, rightNode );

		var condition2 = new ElseNode();

		var result1 = new DialogBlockNode();
		result1.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var result2 = new DialogBlockNode();
		result2.AddChild(new FuncNode("print", [new LiteralNode("...")]));

		var ifNode = new IfNode( [ condition1, condition2 ], [ result1, result2 ] );
		var block = new CodeBlockNode();
		block.AddChild( ifNode );
		return block;
	}

	this.ReadDialogScript = function(lines, i) {
		var scriptStr = "";
		if (lines[i] === Sym.DialogOpen) {
			scriptStr += lines[i] + "\n";
			i++;
			while(lines[i] != Sym.DialogClose) {
				scriptStr += lines[i] + "\n";
				i++;
			}
			scriptStr += lines[i];
			i++;
		}
		else {
			scriptStr += lines[i];
			i++;
		}
		return { script:scriptStr, index:i };
	}

	// TODO this.ReadCodeScript (reads through code open and close symbols), and this.ReadScript

	this.EnsureDialogBlockFormat = function(dialogStr) {
		// TODO -- what if it's already enclosed in dialog symbols??
		if(dialogStr.indexOf('\n') > -1) {
			dialogStr = Sym.DialogOpen + "\n" + dialogStr + "\n" + Sym.DialogClose;
		}
		return dialogStr;
	}

	this.RemoveDialogBlockFormat = function(source) {
		var sourceLines = source.split("\n");
		var dialogStr = "";
		if(sourceLines[0] === Sym.DialogOpen) {
			// multi line
			var i = 1;
			while (i < sourceLines.length && sourceLines[i] != Sym.DialogClose) {
				dialogStr += sourceLines[i] + (sourceLines[i+1] != Sym.DialogClose ? '\n' : '');
				i++;
			}
		}
		else {
			// single line
			dialogStr = source;
		}
		return dialogStr;
	}

	this.SerializeDialogNodeList = function(nodeList) {
		var tempBlock = new DialogBlockNode(false);
		 // set children directly to avoid breaking the parenting chain for this temp operation
		tempBlock.children = nodeList;
		return tempBlock.Serialize();
	}

	this.GetOperatorList = function() {
		return [Sym.Set].concat(Sym.Operators);
	}

	this.IsInlineCode = function(node) {
		return isInlineCode(node);
	}
}


/* BUILT-IN FUNCTIONS */ // TODO: better way to encapsulate these?
function deprecatedFunc(environment,parameters,onReturn) {
	console.debug("BITSY SCRIPT WARNING: Tried to use deprecated function");
	onReturn(null);
}

function printFunc(environment, parameters, onReturn) {
	if (parameters[0] != undefined && parameters[0] != null) {
		var textStr = "" + parameters[0];
		environment.GetDialogBuffer().AddText(textStr);
		environment.GetDialogBuffer().AddScriptReturn(function() { onReturn(null); });
	}
	else {
		onReturn(null);
	}
}

function linebreakFunc(environment, parameters, onReturn) {
	// console.debug("LINEBREAK FUNC");
	environment.GetDialogBuffer().AddLinebreak();
	environment.GetDialogBuffer().AddScriptReturn(function() { onReturn(null); });
}

function pagebreakFunc(environment, parameters, onReturn) {
	environment.GetDialogBuffer().AddPagebreak(function() { onReturn(null); });
}

function printDrawingFunc(environment, parameters, onReturn) {
	var drawingId = parameters[0];
	environment.GetDialogBuffer().AddDrawing(drawingId);
	environment.GetDialogBuffer().AddScriptReturn(function() { onReturn(null); });
}

function printSpriteFunc(environment,parameters,onReturn) {
	var spriteId = parameters[0];
	if(names.sprite.has(spriteId)) spriteId = names.sprite.get(spriteId); // id is actually a name
	var drawingId = sprite[spriteId].drw;
	printDrawingFunc(environment, [drawingId], onReturn);
}

function printTileFunc(environment,parameters,onReturn) {
	var tileId = parameters[0];
	if(names.tile.has(tileId)) tileId = names.tile.get(tileId); // id is actually a name
	var drawingId = tile[tileId].drw;
	printDrawingFunc(environment, [drawingId], onReturn);
}

function printItemFunc(environment,parameters,onReturn) {
	var itemId = parameters[0];
	if(names.item.has(itemId)) itemId = names.item.get(itemId); // id is actually a name
	var drawingId = item[itemId].drw;
	printDrawingFunc(environment, [drawingId], onReturn);
}

function printFontFunc(environment, parameters, onReturn) {
	var allCharacters = "";
	var font = fontManager.Get( fontName );
	var codeList = font.allCharCodes();
	for (var i = 0; i < codeList.length; i++) {
		allCharacters += String.fromCharCode(codeList[i]) + " ";
	}
	printFunc(environment, [allCharacters], onReturn);
}

function itemFunc(environment,parameters,onReturn) {
	var itemId = parameters[0];

	if (names.item.has(itemId)) {
		// id is actually a name
		itemId = names.item.get(itemId);
	}

	var curItemCount = player().inventory[itemId] ? player().inventory[itemId] : 0;

	if (parameters.length > 1) {
		// TODO : is it a good idea to force inventory to be >= 0?
		player().inventory[itemId] = Math.max(0, parseInt(parameters[1]));
		curItemCount = player().inventory[itemId];

		if (onInventoryChanged != null) {
			onInventoryChanged(itemId);
		}
	}

	onReturn(curItemCount);
}

    function addOrRemoveTextEffect(environment, name, parameters) {
        if (environment.GetDialogBuffer().HasTextEffect(name)) {
            environment.GetDialogBuffer().RemoveTextEffect(name);
        }
        else {
            environment.GetDialogBuffer().AddTextEffect(name, parameters);
        }
}

function rainbowFunc(environment,parameters,onReturn) {
	addOrRemoveTextEffect(environment,"rbw");
	onReturn(null);
}

// TODO : should the colors use a parameter instead of special names?
function color1Func(environment,parameters,onReturn) {
	if (parameters[0]) {
		const pal = getPal(curPal());
		const color = pal[0];
		dialogRenderer.SetArrowColor(color);
	}
	addOrRemoveTextEffect(environment,"clr1");
	onReturn(null);
}

function color2Func(environment,parameters,onReturn) {
	if (parameters[0]) {
		const pal = getPal(curPal());
		const color = pal[1];
		dialogRenderer.SetArrowColor(color);
	}
	addOrRemoveTextEffect(environment,"clr2");
	onReturn(null);
}

function color3Func(environment,parameters,onReturn) {
	if (parameters[0]) {
		const pal = getPal(curPal());
		const color = pal[2];
		dialogRenderer.SetArrowColor(color);
	}
	addOrRemoveTextEffect(environment,"clr3");
	onReturn(null);
}
    
function colorFunc(environment,parameters,onReturn) {
	if (parameters[1]) {
		const pal = getPal(curPal());
		const color = pal[parameters[0]];
		dialogRenderer.SetArrowColor(color);
	}
    addOrRemoveTextEffect(environment, "clr", parameters[0]);
	onReturn(null);
}

function bgColorFunc(environment, parameters, onReturn) {
	const pal = getPal(curPal());
	const color = pal[parameters[0]];
	dialogRenderer.SetBgColor(color);
	onReturn(null);
}

function borderColorFunc(environment, parameters, onReturn) {
	const pal = getPal(curPal());
	const color = pal[parameters[0]];
	dialogRenderer.SetBorderColor(color);
	onReturn(null);
}

function wavyFunc(environment,parameters,onReturn) {
	addOrRemoveTextEffect(environment,"wvy");
	onReturn(null);
}

function shakyFunc(environment,parameters,onReturn) {
	addOrRemoveTextEffect(environment,"shk");
	onReturn(null);
}

function propertyFunc(environment, parameters, onReturn) {
	var outValue = null;

	if (parameters.length > 0 && parameters[0]) {
		var propertyName = parameters[0];

		if (environment.HasProperty(propertyName)) {
			// TODO : in a future update I can handle the case of initializing a new property
			// after which we can move this block outside the HasProperty check
			if (parameters.length > 1) {
				var inValue = parameters[1];
				environment.SetProperty(propertyName, inValue);
			}

			outValue = environment.GetProperty(propertyName);
		}
	}

	console.debug("PROPERTY! " + propertyName + " " + outValue);

	onReturn(outValue);
}

function endFunc(environment,parameters,onReturn) {
	isEnding = true;
	isNarrating = true;
	dialogRenderer.SetCentered(true);

	b3d.transitionMatte.style.backgroundColor = 'black';
	b3d.transitionMatte.style.opacity = 1;

	onReturn(null);
}

let prevLocation;
function exitFunc(environment,parameters,onReturn) {
	var destRoom = parameters[0];

	if (names.room.has(destRoom)) {
		// it's a name, not an id! (note: these could cause trouble if people names things weird)
		destRoom = names.room.get(destRoom);
	}

	var destX = parseInt(parameters[1]);
	var destY = parseInt(parameters[2]);

	const updatePosition = () => {
		prevLocation = [curRoom, player().x, player().y];

		player().room = destRoom;
		player().x = destX;
		player().y = destY;

		curRoom = destRoom;
		initRoom(curRoom);
	}

	if (parameters.length >= 4) {
		var transitionEffect = parameters[3];

		transition.Transition3D(transitionEffect, updatePosition);
		transition.BeginTransition(
			player().room,
			player().x,
			player().y,
			destRoom,
			destX,
			destY,
			transitionEffect);
		transition.UpdateTransition(0);
	} else {
		updatePosition();
	}

	onReturn(null);
}

function returnFunc(environment,parameters,onReturn) {
	if (!prevLocation) return;

	const transitionEffect = parameters[0];
	if (transitionEffect) prevLocation.push(transitionEffect);

	exitFunc(environment, prevLocation, onReturn);
	prevLocation = null;
}

function getMusicPlayer(playerId, doLoop) {
	let player = document.getElementById(playerId);
	if (!player) {
		player = document.createElement('audio');
		player.id = playerId;
		player.loop = doLoop;
		player.style.display = 'none';
		document.querySelector('body').append(player);

		player.addEventListener('pause', (e) => {
			console.debug('MUSIC PAUSED', e);
		});
	}
	return player;
}
function getMusicSrc(parameters) {
	// support optional local path for exported games
	const fileName = parameters[0];
	if (!fileName || fileName === 'stop') return false;
	if (!isPlayerEmbeddedInEditor) {
		return `audio/${fileName}`; // depends on game file being stored next to a local audio directory
	} else if (!baseAudioUrl || ['http', 'www', '//'].some((str) => fileName.includes(str))) {
		return fileName;
	} else {
		return `${baseAudioUrl}${baseAudioUrl.endsWith('/') ? '' : '/'}${fileName}`;
	}
}

function musicFunc(environment, parameters, onReturn) {
	if (isPlayerEmbeddedInEditor && doMuteAudio) return onReturn(null);

	const MAX_MUSIC_VOLUME = .4;

	const player1 = getMusicPlayer('music-player-1', true);
	const player2 = getMusicPlayer('music-player-2', true);

	const fadeOut = () => {
		if (player1.volume > 0) {
			player1.volume = Math.max(player1.volume - .01, 0);
			setTimeout(fadeOut, 25);
		} else {
			player1.pause();
		}
	}
	const fadeIn = () => {
		if (player1.volume < MAX_MUSIC_VOLUME) {
			player1.volume = Math.min(player1.volume + .01, MAX_MUSIC_VOLUME);
			setTimeout(fadeIn, 25);
		}
	}
	const crossfadeAudio = () => {
		if (player1.volume === 0) {
			player1.pause();
			player1.id = 'music-player-2';
			player2.id = 'music-player-1';
			return;
		}
		player1.volume = Math.max(player1.volume - .01, 0);
		player2.volume = Math.min(player2.volume + .01, MAX_MUSIC_VOLUME);
		setTimeout(crossfadeAudio, 25);
	}

	const playMusic = () => {
		player2.pause();
		if (isMobileDevice()) {
			player1.pause(); // TODO: better fix for mobile audio issues
		}

		if (player1.paused || !player1.currentTime) {
			player1.src = src;
			player1.currentTime = 0;
			player1.volume = 0;
			player1.play();

			console.debug('PLAYING MUSIC:', src);
			fadeIn();
		} else {
			player2.src = src;
			player2.currentTime = 0;
			player2.volume = 0;
			player2.play();

			console.debug('CROSSFADING INTO:', src);
			crossfadeAudio();
		}
	}

	const src = getMusicSrc(parameters);
	if (src) {
		dialogBuffer.OnceOnEnd(playMusic);
	} else {
		console.debug('STOPPING MUSIC');
		player2.pause();
		fadeOut();
	}

	onReturn(null);
}

function sfxFunc(environment, parameters, onReturn) {
	if (isPlayerEmbeddedInEditor && doMuteAudio) return onReturn(null);

	const sfxPlayer = getMusicPlayer('sfx-player');
	if (!sfxPlayer.currentTime || sfxPlayer.paused) {
		const src = getMusicSrc(parameters);
		sfxPlayer.currentTime = 0;
		sfxPlayer.src = src;
		sfxPlayer.volume = parameters[1] || 1;
		sfxPlayer.play();
	}

	onReturn(null);
}

function centerAlignFunc(environment,parameters, onReturn) {
	dialogRenderer.SetCentered(true, true);
	onReturn(null);
}

function paperStyleFunc(environment, parameters, onReturn) {
	dialogBuffer.SetRowWidth(140);
	dialogBuffer.SetMaxLines(12);
	dialogRenderer.SetDialogStyle('paper');
	onReturn(null);
}

function userInputFunc(environment, parameters, onReturn) {
	const variableName = parameters[0];
	if (!variableName) {
		return onReturn(null);
	}

	if (isMobileDevice()) {
		const keyboardOverlay = document.createElement('div');
		keyboardOverlay.id = 'keyboardOverlay';

		const minInput = parameters[1] || 1;
		const maxInput = parameters[2] || 9;

		for (let i = minInput; i < maxInput + 1; i++) {
			const numberOption = document.createElement('div');
			numberOption.innerHTML = i ;
			numberOption.classList.add('numKey');
			numberOption.setAttribute('data-num-key', i);
			numberOption.onclick = function() {
				const val = this.getAttribute('data-num-key');
				environment.SetVariable(variableName, parseInt(val));
				console.debug(`Set ${variableName} to ${val}`);

				keyboardOverlay.remove();
				dialogBuffer.Continue();
			}
			keyboardOverlay.appendChild(numberOption);
		}

		document.querySelector('body').appendChild(keyboardOverlay);
	} else {
		document.addEventListener("keydown", function(e) {
			environment.SetVariable(variableName, parseInt(e.key));
			console.debug(`Set ${variableName} to ${e.key}`);
		}, {once: true});
	}

	onReturn(null);
}

function fogFunc(environment, parameters, onReturn) {
	const newFogStart = parseFloat(parameters[0]);
	const newFogEnd = parseFloat(parameters[1]);
	const roomName = parameters[2];

	let roomData, isCurRoom;
	if (roomName && names.room.has(roomName)) {
		const roomId = names.room.get(roomName);
		roomData = room[roomId];
		isCurRoom = (roomId === curRoom);
	} else {
		roomData = room[curRoom];
		isCurRoom = true;
	}

	const FOG_INCREMENT = .25;

	function animateFogSettings() {
		let doneAnimating = true;
		if (isNumber(newFogStart)) {
			const currentFogStart = b3d.scene.fogStart;
			const startDelta = newFogStart - currentFogStart;
			if (Math.abs(startDelta) > FOG_INCREMENT) {
				roomData.fogStart = currentFogStart + (startDelta > 0 ? FOG_INCREMENT : -FOG_INCREMENT);
				doneAnimating = false;
			} else {
				roomData.fogStart = newFogStart;
			}
		}
		if (isNumber(newFogEnd)) {
			const currentFogEnd = b3d.scene.fogEnd;
			const endDelta = newFogEnd - currentFogEnd;
			if (Math.abs(endDelta) > FOG_INCREMENT) {
				roomData.fogEnd = currentFogEnd + (endDelta > 0 ? FOG_INCREMENT : -FOG_INCREMENT);
				doneAnimating = false;
			} else {
				roomData.fogEnd = newFogEnd;
			}
		}

		b3d.applySettings();
		b3d.resetTextureCache();

		if (!doneAnimating) {
			setTimeout(() => animateFogSettings(), 10);
		} else {
			console.debug('FINISHED UPDATING ROOM FOG');
		}
	}

	if (isCurRoom) {
		animateFogSettings();
	} else {
		if (isNumber(newFogStart)) roomData.fogStart = newFogStart;
		if (isNumber(newFogEnd)) roomData.fogEnd = newFogEnd;
		b3d.resetTextureCache();
	}

	onReturn(null);
}

function ambientFunc(environment, parameters, onReturn) {
	const newColor = JSON.parse(parameters[0]);
	const COLOR_INCREMENT = .01;

	function animateColor() {
		const curColor = b3d.scene.ambientColor.asArray();
		let doneAnimating = true;

		for (let i = 0; i < 3; i++) {
			const colorDelta = newColor[i] - curColor[i];
			if (Math.abs(colorDelta) > COLOR_INCREMENT) {
				doneAnimating = false;
				curColor[i] = curColor[i] + (colorDelta > 0 ? COLOR_INCREMENT : -COLOR_INCREMENT);
			} else {
				curColor[i] = newColor[i];
			}
		}

		// Color3 should support fromArray(), but it's not working...
		b3d.scene.ambientColor.r = curColor[0];
		b3d.scene.ambientColor.g = curColor[1];
		b3d.scene.ambientColor.b = curColor[2];

		if (!doneAnimating) {
			setTimeout(() => animateColor(), 15);
		} else {
			console.debug('FINISHED UPDATING AMBIENT COLOR');
		}
	}

	const doAnimate = parameters[1];
	if (doAnimate) {
		animateColor();
	} else {
		b3d.scene.ambientColor.r = newColor[0];
		b3d.scene.ambientColor.g = newColor[1];
		b3d.scene.ambientColor.b = newColor[2];
	}

	onReturn(null);
}

function replaceElementFunc(environment, parameters, onReturn) {
	const oldEntityName = parameters[0];
	const newEntityName = parameters[1];
	const roomName = parameters[2];

	let entityType;
	const findEntity = (entityName) => {
		let entityId;
		if (names.tile.has(entityName)) {
			entityId = names.tile.get(entityName);
			entityType = 'tile';
		} else if (names.sprite.has(entityName)) {
			entityId = names.sprite.get(entityName);
			entityType = 'sprite';
		} else if (names.item.has(entityName)) {
			entityId = names.item.get(entityName);
			entityType = 'item';
		}
		return entityId;
	}

	const oldEntityId = findEntity(oldEntityName);
	const newEntityId = findEntity(newEntityName);

	if (!(oldEntityId && newEntityId)) {
		console.error('Error (replace command): One or more of the specified game elements could not be found');
		return;
	}

	let roomData;
	if (entityType !== 'sprite') {
		const roomId = names.room.get(roomName);
		roomData = room[roomId];

		if (!roomData) {
			console.error('Error (replace command): Please specify a valid room');
			return;
		}
	}

	if (entityType === 'sprite') {
		const oldSpriteData = sprite[oldEntityId];
		const newSpriteData = sprite[newEntityId];

		['room', 'x', 'y'].forEach((prop) => {
			newSpriteData[prop] = oldSpriteData[prop];
			oldSpriteData[prop] = null;
		});
	} else if (entityType === 'item') {
		roomData.items.forEach((item) => {
			if (item.id === oldEntityId) item.id = newEntityId;
		});
	} else if (entityType === 'tile') {
		roomData.tilemap.forEach((row) => {
			row.forEach((col, idx) => {
				if (row[idx] === oldEntityId) row[idx] = newEntityId;
			});
		});
	} else {
		console.error(`Error (replace command): Unable to replace element ${oldEntityName} with element ${newEntityName} for room ${roomName}`);
	}

	onReturn(null);
}

/* BUILT-IN OPERATORS */
function setExp(environment,left,right,onReturn) {
	// console.debug("SET " + left.name);

	if(left.type != "variable") {
		// not a variable! return null and hope for the best D:
		onReturn( null );
		return;
	}

	right.Eval(environment,function(rVal) {
		environment.SetVariable( left.name, rVal );
		// console.debug("VAL " + environment.GetVariable( left.name ) );
		left.Eval(environment,function(lVal) {
			onReturn( lVal );
		});
	});
}
function equalExp(environment,left,right,onReturn) {
	// console.debug("EVAL EQUAL");
	// console.debug(left);
	// console.debug(right);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal === rVal );
		});
	});
}
function greaterExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal > rVal );
		});
	});
}
function lessExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal < rVal );
		});
	});
}
function greaterEqExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal >= rVal );
		});
	});
}
function lessEqExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal <= rVal );
		});
	});
}
function multExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal * rVal );
		});
	});
}
function divExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal / rVal );
		});
	});
}
function addExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal + rVal );
		});
	});
}
function subExp(environment,left,right,onReturn) {
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal - rVal );
		});
	});
}

/* ENVIRONMENT */
var Environment = function() {
	var dialogBuffer = null;
	this.SetDialogBuffer = function(buffer) { dialogBuffer = buffer; };
	this.GetDialogBuffer = function() { return dialogBuffer; };

	var functionMap = new Map();
	functionMap.set("print", printFunc);
	functionMap.set("say", printFunc);
	functionMap.set("br", linebreakFunc);
	functionMap.set("item", itemFunc);
	functionMap.set("rbw", rainbowFunc);
	functionMap.set("clr1", color1Func);
	functionMap.set("clr2", color2Func);
    functionMap.set("clr3", color3Func);
    functionMap.set("clr", colorFunc);
    functionMap.set("bgClr", bgColorFunc);
    functionMap.set("borderClr", borderColorFunc);
	functionMap.set("wvy", wavyFunc);
	functionMap.set("shk", shakyFunc);
	functionMap.set("printSprite", printSpriteFunc);
	functionMap.set("printTile", printTileFunc);
	functionMap.set("printItem", printItemFunc);
	functionMap.set("debugOnlyPrintFont", printFontFunc); // DEBUG ONLY
	functionMap.set("end", endFunc);
	functionMap.set("exit", exitFunc);
	functionMap.set("return", returnFunc); // TODO: expose in UI
	functionMap.set("pg", pagebreakFunc);
	functionMap.set("property", propertyFunc);
	functionMap.set("music", musicFunc);
	functionMap.set("sfx", sfxFunc);
	functionMap.set("center", centerAlignFunc);
	functionMap.set("paper", paperStyleFunc);
	functionMap.set("input", userInputFunc);
	functionMap.set("ambient", ambientFunc);
	functionMap.set("fog", fogFunc);
	functionMap.set("replace", replaceElementFunc);

	this.HasFunction = function(name) { return functionMap.has(name); };
	this.EvalFunction = function(name,parameters,onReturn,env) {
		if (env == undefined || env == null) {
			env = this;
		}

		functionMap.get(name)(env, parameters, onReturn);
	}

	var variableMap = new Map();

	this.HasVariable = function(name) { return variableMap.has(name); };
	this.GetVariable = function(name) { return variableMap.get(name); };
	this.SetVariable = function(name,value,useHandler) {
		// console.debug("SET VARIABLE " + name + " = " + value);
		if(useHandler === undefined) useHandler = true;
		variableMap.set(name, value);
		if(onVariableChangeHandler != null && useHandler){
			onVariableChangeHandler(name);
		}
	};
	this.DeleteVariable = function(name,useHandler) {
		if(useHandler === undefined) useHandler = true;
		if(variableMap.has(name)) {
			variableMap.delete(name);
			if(onVariableChangeHandler != null && useHandler) {
				onVariableChangeHandler(name);
			}
		}
	};

	var operatorMap = new Map();
	operatorMap.set("=", setExp);
	operatorMap.set("==", equalExp);
	operatorMap.set(">", greaterExp);
	operatorMap.set("<", lessExp);
	operatorMap.set(">=", greaterEqExp);
	operatorMap.set("<=", lessEqExp);
	operatorMap.set("*", multExp);
	operatorMap.set("/", divExp);
	operatorMap.set("+", addExp);
	operatorMap.set("-", subExp);

	this.HasOperator = function(sym) { return operatorMap.get(sym); };
	this.EvalOperator = function(sym,left,right,onReturn) {
		operatorMap.get( sym )( this, left, right, onReturn );
	}

	var scriptMap = new Map();
	this.HasScript = function(name) { return scriptMap.has(name); };
	this.GetScript = function(name) { return scriptMap.get(name); };
	this.SetScript = function(name,script) { scriptMap.set(name, script); };

	var onVariableChangeHandler = null;
	this.SetOnVariableChangeHandler = function(onVariableChange) {
		onVariableChangeHandler = onVariableChange;
	}
	this.GetVariableNames = function() {
		return Array.from( variableMap.keys() );
	}
}

// Local environment for a single run of a script: knows local context
var LocalEnvironment = function(parentEnvironment) {
	// this.SetDialogBuffer // not allowed in local environment?
	this.GetDialogBuffer = function() { return parentEnvironment.GetDialogBuffer(); };

	this.HasFunction = function(name) { return parentEnvironment.HasFunction(name); };
	this.EvalFunction = function(name,parameters,onReturn,env) {
		if (env == undefined || env == null) {
			env = this;
		}

		parentEnvironment.EvalFunction(name,parameters,onReturn,env);
	}

	this.HasVariable = function(name) { return parentEnvironment.HasVariable(name); };
	this.GetVariable = function(name) { return parentEnvironment.GetVariable(name); };
	this.SetVariable = function(name,value,useHandler) { parentEnvironment.SetVariable(name,value,useHandler); };
	// this.DeleteVariable // not needed in local environment?

	this.HasOperator = function(sym) { return parentEnvironment.HasOperator(sym); };
	this.EvalOperator = function(sym,left,right,onReturn,env) {
		if (env == undefined || env == null) {
			env = this;
		}

		parentEnvironment.EvalOperator(sym,left,right,onReturn,env);
	};

	// TODO : I don't *think* any of this is required by the local environment
	// this.HasScript
	// this.GetScript
	// this.SetScript

	// TODO : pretty sure these debug methods aren't required by the local environment either
	// this.SetOnVariableChangeHandler
	// this.GetVariableNames

	/* Here's where specific local context data goes:
	 * this includes access to the object running the script
	 * and any properties it may have (so far only "locked")
	 */

	// The local environment knows what object called it -- currently only used to access properties
	var curObject = null;
	this.HasObject = function() { return curObject != undefined && curObject != null; }
	this.SetObject = function(object) { curObject = object; }
	this.GetObject = function() { return curObject; }

	// accessors for properties of the object that's running the script
	this.HasProperty = function(name) {
		if (curObject && curObject.property && curObject.property.hasOwnProperty(name)) {
			return true;
		}
		else {
			return false;
		}
	};
	this.GetProperty = function(name) {
		if (curObject && curObject.property && curObject.property.hasOwnProperty(name)) {
			return curObject.property[name]; // TODO : should these be getters and setters instead?
		}
		else {
			return null;
		}
	};
	this.SetProperty = function(name, value) {
		// NOTE : for now, we need to gaurd against creating new properties
		if (curObject && curObject.property && curObject.property.hasOwnProperty(name)) {
			curObject.property[name] = value;
		}
	};
}

function leadingWhitespace(depth) {
	var str = "";
	for(var i = 0; i < depth; i++) {
		str += "  "; // two spaces per indent
	}
	// console.debug("WHITESPACE " + depth + " ::" + str + "::");
	return str;
}

/* NODES */
var TreeRelationship = function() {
	this.parent = null;
	this.children = [];

	this.AddChild = function(node) {
		this.children.push(node);
		node.parent = this;
	};

	this.AddChildren = function(nodeList) {
		for (var i = 0; i < nodeList.length; i++) {
			this.AddChild(nodeList[i]);
		}
	};

	this.SetChildren = function(nodeList) {
		this.children = [];
		this.AddChildren(nodeList);
	};

	this.VisitAll = function(visitor, depth) {
		if (depth == undefined || depth == null) {
			depth = 0;
		}

		visitor.Visit(this, depth);
		for (var i = 0; i < this.children.length; i++) {
			this.children[i].VisitAll( visitor, depth + 1 );
		}
	};

	this.rootId = null; // for debugging
	this.GetId = function() {
		// console.debug(this);
		if (this.rootId != null) {
			return this.rootId;
		}
		else if (this.parent != null) {
			var parentId = this.parent.GetId();
			if (parentId != null) {
				return parentId + "_" + this.parent.children.indexOf(this);
			}
		}
		else {
			return null;
		}
	}
}

var DialogBlockNode = function(doIndentFirstLine) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "dialog_block";

	this.Eval = function(environment, onReturn) {
		// console.debug("EVAL BLOCK " + this.children.length);

		if (isPlayerEmbeddedInEditor && events != undefined && events != null) {
			events.Raise("script_node_enter", { id: this.GetId() });
		}

		var lastVal = null;
		var i = 0;

		function evalChildren(children, done) {
			if (i < children.length) {
				// console.debug(">> CHILD " + i);
				children[i].Eval(environment, function(val) {
					// console.debug("<< CHILD " + i);
					lastVal = val;
					i++;
					evalChildren(children,done);
				});
			}
			else {
				done();
			}
		};

		var self = this;
		evalChildren(this.children, function() {
			if (isPlayerEmbeddedInEditor && events != undefined && events != null) {
				events.Raise("script_node_exit", { id: self.GetId() });
			}

			onReturn(lastVal);
		});
	}

	if (doIndentFirstLine === undefined) {
		doIndentFirstLine = true; // This is just for serialization
	}

	this.Serialize = function(depth) {
		if (depth === undefined) {
			depth = 0;
		}

		var str = "";
		var lastNode = null;

		for (var i = 0; i < this.children.length; i++) {

			var curNode = this.children[i];

			var curNodeIsNonInlineCode = curNode.type === "code_block" && !isInlineCode(curNode);
			var prevNodeIsNonInlineCode = lastNode && lastNode.type === "code_block" && !isInlineCode(lastNode);

			var shouldIndentFirstLine = (i == 0 && doIndentFirstLine);
			var shouldIndentAfterLinebreak = (lastNode && lastNode.type === "function" && lastNode.name === "br");
			var shouldIndentCodeBlock = i > 0 && curNodeIsNonInlineCode;
			var shouldIndentAfterCodeBlock = prevNodeIsNonInlineCode;

			// need to insert a newline before the first block of non-inline code that isn't 
			// preceded by a {br}, since those will create their own newline
			// if (i > 0 && curNodeIsNonInlineCode && !prevNodeIsNonInlineCode && !shouldIndentAfterLinebreak) {
			// 	str += "\n";
			// }

			if (shouldIndentFirstLine || shouldIndentAfterLinebreak || shouldIndentCodeBlock || shouldIndentAfterCodeBlock) {
				str += leadingWhitespace(depth);
			}

			str += curNode.Serialize(depth);

			// if (i < this.children.length-1 && curNodeIsNonInlineCode) {
			// 	str += "\n";
			// }

			lastNode = curNode;
		}

		return str;
	}

	this.ToString = function() {
		return this.type + " " + this.GetId();
	};
}

var CodeBlockNode = function() {
	Object.assign( this, new TreeRelationship() );
	this.type = "code_block";

	this.Eval = function(environment, onReturn) {
		// console.debug("EVAL BLOCK " + this.children.length);

		if (isPlayerEmbeddedInEditor && events != undefined && events != null) {
			events.Raise("script_node_enter", { id: this.GetId() });
		}

		var lastVal = null;
		var i = 0;

		function evalChildren(children, done) {
			if (i < children.length) {
				// console.debug(">> CHILD " + i);
				children[i].Eval(environment, function(val) {
					// console.debug("<< CHILD " + i);
					lastVal = val;
					i++;
					evalChildren(children,done);
				});
			}
			else {
				done();
			}
		};

		var self = this;
		evalChildren(this.children, function() {
			if (isPlayerEmbeddedInEditor && events != undefined && events != null) {
				events.Raise("script_node_exit", { id: self.GetId() });
			}

			onReturn(lastVal);
		});
	}

	this.Serialize = function(depth) {
		if(depth === undefined) {
			depth = 0;
		}

		// console.debug("SERIALIZE BLOCK!!!");
		// console.debug(depth);
		// console.debug(doIndentFirstLine);

		var str = "{"; // todo: increase scope of Sym?

		// TODO : do code blocks ever have more than one child anymore????
		for (var i = 0; i < this.children.length; i++) {
			var curNode = this.children[i];
			str += curNode.Serialize(depth);
		}

		str += "}";

		return str;
	}

	this.ToString = function() {
		return this.type + " " + this.GetId();
	};
}

function isInlineCode(node) {
	return isTextEffectBlock(node) || isUndefinedBlock(node) || isMultilineListBlock(node);
}

function isUndefinedBlock(node) {
	return node.type === "code_block" && node.children.length > 0 && node.children[0].type === "undefined";
}

var textEffectBlockNames = ["clr1", "clr2", "clr3", "clr", "wvy", "shk", "rbw", "printSprite", "printItem", "printTile", "print", "say", "br"];
function isTextEffectBlock(node) {
	if (node.type === "code_block") {
		if (node.children.length > 0 && node.children[0].type === "function") {
			var func = node.children[0];
			return textEffectBlockNames.indexOf(func.name) != -1;
		}
	}
	return false;
}

var listBlockTypes = ["sequence", "cycle", "shuffle", "if"];
function isMultilineListBlock(node) {
	if (node.type === "code_block") {
		if (node.children.length > 0) {
			var child = node.children[0];
			return listBlockTypes.indexOf(child.type) != -1;
		}
	}
	return false;
}

// for round-tripping undefined code through the parser (useful for hacks!)
var UndefinedNode = function(sourceStr) {
	Object.assign(this, new TreeRelationship());
	this.type = "undefined";
	this.source = sourceStr;

	this.Eval = function(environment,onReturn) {
		addOrRemoveTextEffect(environment, "_debug_highlight");
		printFunc(environment, ["{" + sourceStr + "}"], function() {
			onReturn(null);
		});
		addOrRemoveTextEffect(environment, "_debug_highlight");
	}

	this.Serialize = function(depth) {
		return this.source;
	}

	this.ToString = function() {
		return "undefined" + " " + this.GetId();
	}
}

var FuncNode = function(name,args) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "function";
	this.name = name;
	this.args = args;

	this.Eval = function(environment,onReturn) {
		if (isPlayerEmbeddedInEditor && events != undefined && events != null) {
			events.Raise("script_node_enter", { id: this.GetId() });
		}

		var self = this; // hack to deal with scope (TODO : move up higher?)

		var argumentValues = [];
		var i = 0;

		function evalArgs(args, done) {
			// TODO : really hacky way to make we get the first
			// symbol's NAME instead of its variable value
			// if we are trying to do something with a property
			if (self.name === "property" && i === 0 && i < args.length) {
				if (args[i].type === "variable") {
					argumentValues.push(args[i].name);
					i++;
				}
				else {
					// first argument for a property MUST be a variable symbol
					// -- so skip everything if it's not!
					i = args.length;
				}
			}

			if (i < args.length) {
				// Evaluate each argument
				args[i].Eval(
					environment,
					function(val) {
						argumentValues.push(val);
						i++;
						evalArgs(args, done);
					});
			}
			else {
				done();
			}
		};

		evalArgs(
			this.args,
			function() {
				if (isPlayerEmbeddedInEditor && events != undefined && events != null) {
					events.Raise("script_node_exit", { id: self.GetId() });
				}

				environment.EvalFunction(self.name, argumentValues, onReturn);
			});
	}

	this.Serialize = function(depth) {
		var isDialogBlock = this.parent.type === "dialog_block";
		if (isDialogBlock && this.name === "print") {
			// TODO this could cause problems with "real" print functions
			return this.args[0].value; // first argument should be the text of the {print} func
		}
		else if (isDialogBlock && this.name === "br") {
			return "\n";
		}
		else {
			var str = "";
			str += this.name;
			for(var i = 0; i < this.args.length; i++) {
				str += " ";
				str += this.args[i].Serialize(depth);
			}
			return str;
		}
	}

	this.ToString = function() {
		return this.type + " " + this.name + " " + this.GetId();
	};
}

var LiteralNode = function(value) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "literal";
	this.value = value;

	this.Eval = function(environment,onReturn) {
		onReturn(this.value);
	}

	this.Serialize = function(depth) {
		var str = "";

		if (this.value === null) {
			return str;
		}

		if (typeof this.value === "string") {
			str += '"';
		}

		str += this.value;

		if (typeof this.value === "string") {
			str += '"';
		}

		return str;
	}

	this.ToString = function() {
		return this.type + " " + this.value + " " + this.GetId();
	};
}

var VarNode = function(name) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "variable";
	this.name = name;

	this.Eval = function(environment,onReturn) {
		// console.debug("EVAL " + this.name + " " + environment.HasVariable(this.name) + " " + environment.GetVariable(this.name));
		if( environment.HasVariable(this.name) )
			onReturn( environment.GetVariable( this.name ) );
		else
			onReturn(null); // not a valid variable -- return null and hope that's ok
	} // TODO: might want to store nodes in the variableMap instead of values???

	this.Serialize = function(depth) {
		var str = "" + this.name;
		return str;
	}

	this.ToString = function() {
		return this.type + " " + this.name + " " + this.GetId();
	};
}

var ExpNode = function(operator, left, right) {
	Object.assign( this, new TreeRelationship() );
	this.type = "operator";
	this.operator = operator;
	this.left = left;
	this.right = right;

	this.Eval = function(environment,onReturn) {
		// console.debug("EVAL " + this.operator);
		var self = this; // hack to deal with scope
		environment.EvalOperator( this.operator, this.left, this.right, 
			function(val){
				// console.debug("EVAL EXP " + self.operator + " " + val);
				onReturn(val);
			} );
		// NOTE : sadly this pushes a lot of complexity down onto the actual operator methods
	}

	this.Serialize = function(depth) {
		var isNegativeNumber = this.operator === "-" && this.left.type === "literal" && this.left.value === null;

		if (!isNegativeNumber) {
			var str = "";

			if (this.left != undefined && this.left != null) {
				str += this.left.Serialize(depth) + " ";
			}

			str += this.operator;

			if (this.right != undefined && this.right != null) {
				str += " " + this.right.Serialize(depth);
			}

			return str;
		}
		else {
			return this.operator + this.right.Serialize(depth); // hacky but seems to work
		}
	}

	this.VisitAll = function(visitor, depth) {
		if (depth == undefined || depth == null) {
			depth = 0;
		}

		visitor.Visit( this, depth );
		if(this.left != null)
			this.left.VisitAll( visitor, depth + 1 );
		if(this.right != null)
			this.right.VisitAll( visitor, depth + 1 );
	};

	this.ToString = function() {
		return this.type + " " + this.operator + " " + this.GetId();
	};
}

var SequenceBase = function() {
	this.Serialize = function(depth) {
		var str = "";
		str += this.type + "\n";
		for (var i = 0; i < this.children.length; i++) {
			str += leadingWhitespace(depth + 1) + Sym.List + " ";
			str += this.children[i].Serialize(depth + 2);
			str += "\n";
		}
		str += leadingWhitespace(depth);
		return str;
	}

	this.VisitAll = function(visitor, depth) {
		if (depth == undefined || depth == null) {
			depth = 0;
		}

		visitor.Visit(this, depth);
		for (var i = 0; i < this.children.length; i++) {
			this.children[i].VisitAll( visitor, depth + 1 );
		}
	};

	this.ToString = function() {
		return this.type + " " + this.GetId();
	};
}

var SequenceNode = function(options) {
	Object.assign(this, new TreeRelationship());
	Object.assign(this, new SequenceBase());
	this.type = "sequence";
	this.AddChildren(options);

	var index = 0;
	this.Eval = function(environment, onReturn) {
		// console.debug("SEQUENCE " + index);
		this.children[index].Eval(environment, onReturn);

		var next = index + 1;
		if (next < this.children.length) {
			index = next;
		}
	}
}

var CycleNode = function(options) {
	Object.assign(this, new TreeRelationship());
	Object.assign(this, new SequenceBase());
	this.type = "cycle";
	this.AddChildren(options);

	var index = 0;
	this.Eval = function(environment, onReturn) {
		// console.debug("CYCLE " + index);
		this.children[index].Eval(environment, onReturn);

		var next = index + 1;
		if (next < this.children.length) {
			index = next;
		}
		else {
			index = 0;
		}
	}
}

var ShuffleNode = function(options) {
	Object.assign(this, new TreeRelationship());
	Object.assign(this, new SequenceBase());
	this.type = "shuffle";
	this.AddChildren(options);

	var optionsShuffled = [];
	function shuffle(options) {
		optionsShuffled = [];
		var optionsUnshuffled = options.slice();
		while (optionsUnshuffled.length > 0) {
			var i = Math.floor(Math.random() * optionsUnshuffled.length);
			optionsShuffled.push(optionsUnshuffled.splice(i,1)[0]);
		}
	}
	shuffle(this.children);

	var index = 0;
	this.Eval = function(environment, onReturn) {
		optionsShuffled[index].Eval(environment, onReturn);
		
		index++;
		if (index >= this.children.length) {
			shuffle(this.children);
			index = 0;
		}
	}
}

// TODO : rename? ConditionalNode?
var IfNode = function(conditions, results, isSingleLine) {
	Object.assign(this, new TreeRelationship());
	this.type = "if";

	for (var i = 0; i < conditions.length; i++) {
		this.AddChild(new ConditionPairNode(conditions[i], results[i]));
	}

	var self = this;
	this.Eval = function(environment, onReturn) {
		// console.debug("EVAL IF");
		var i = 0;
		function TestCondition() {
			self.children[i].Eval(environment, function(result) {
				if (result.conditionValue == true) {
					onReturn(result.resultValue);
				}
				else if (i+1 < self.children.length) {
					i++;
					TestCondition();
				}
				else {
					onReturn(null);
				}
			});
		};
		TestCondition();
	}

	if (isSingleLine === undefined) {
		isSingleLine = false; // This is just for serialization
	}

	this.Serialize = function(depth) {
		var str = "";
		if(isSingleLine) {
			// HACKY - should I even keep this mode???
			str += this.children[0].children[0].Serialize() + " ? " + this.children[0].children[1].Serialize();
			if (this.children.length > 1 && this.children[1].children[0].type === Sym.Else) {
				str += " " + Sym.ElseExp + " " + this.children[1].children[1].Serialize();
			}
		}
		else {
			str += "\n";
			for (var i = 0; i < this.children.length; i++) {
				str += this.children[i].Serialize(depth);
			}
			str += leadingWhitespace(depth);
		}
		return str;
	}

	this.IsSingleLine = function() {
		return isSingleLine;
	}

	this.VisitAll = function(visitor, depth) {
		if (depth == undefined || depth == null) {
			depth = 0;
		}

		visitor.Visit(this, depth);

		for (var i = 0; i < this.children.length; i++) {
			this.children[i].VisitAll(visitor, depth + 1);
		}
	};

	this.ToString = function() {
		return this.type + " " + this.mode + " " + this.GetId();
	};
}

var ConditionPairNode = function(condition, result) {
	Object.assign(this, new TreeRelationship());

	this.type = "condition_pair";

	this.AddChild(condition);
	this.AddChild(result);

	var self = this;

	this.Eval = function(environment, onReturn) {
		self.children[0].Eval(environment, function(conditionSuccess) {
			if (conditionSuccess) {
				self.children[1].Eval(environment, function(resultValue) {
					onReturn({ conditionValue:true, resultValue:resultValue });
				});
			}
			else {
				onReturn({ conditionValue:false });
			}
		});
	}

	this.Serialize = function(depth) {
		var str = "";
		str += leadingWhitespace(depth + 1);
		str += Sym.List + " " + this.children[0].Serialize(depth) + " " + Sym.ConditionEnd + Sym.Linebreak;
		str += this.children[1].Serialize(depth + 2) + Sym.Linebreak;
		return str;
	}

	this.VisitAll = function(visitor, depth) {
		if (depth == undefined || depth == null) {
			depth = 0;
		}

		visitor.Visit(this, depth);

		for (var i = 0; i < this.children.length; i++) {
			this.children[i].VisitAll(visitor, depth + 1);
		}
	}

	this.ToString = function() {
		return this.type + " " + this.GetId();
	}
}

var ElseNode = function() {
	Object.assign( this, new TreeRelationship() );
	this.type = Sym.Else;

	this.Eval = function(environment, onReturn) {
		onReturn(true);
	}

	this.Serialize = function() {
		return Sym.Else;
	}

	this.ToString = function() {
		return this.type + " " + this.mode + " " + this.GetId();
	};
}

var Sym = {
	DialogOpen : '"""',
	DialogClose : '"""',
	CodeOpen : "{",
	CodeClose : "}",
	Linebreak : "\n", // just call it "break" ?
	Separator : ":",
	List : "-",
	String : '"',
	ConditionEnd : "?",
	Else : "else",
	ElseExp : ":", // special shorthand for expressions (deprecate?)
	Set : "=",
	Operators : ["==", ">=", "<=", ">", "<", "-", "+", "/", "*"], // operators need to be in reverse order of precedence
};

var Parser = function(env) {
	var environment = env;

	this.Parse = function(scriptStr, rootId) {
		var rootNode = new DialogBlockNode();
		rootNode.rootId = rootId;
		var state = new ParserState(rootNode, scriptStr);

		console.debug(scriptStr);
		console.debug(state.Source());

		if (state.MatchAhead(Sym.DialogOpen)) {
			// multi-line dialog block
			var dialogStr = state.ConsumeBlock(Sym.DialogOpen + Sym.Linebreak, Sym.Linebreak + Sym.DialogClose);
			rootNode = new DialogBlockNode();
			rootNode.rootId = rootId; // hacky!!
			state = new ParserState(rootNode, dialogStr);
			state = ParseDialog(state);
		}
		else {
			// single-line dialog block
			state = ParseDialog(state);
		}

		return state.rootNode;
	};

	var ParserState = function( rootNode, str ) {
		this.rootNode = rootNode;
		this.curNode = this.rootNode;

		var sourceStr = str;
		var i = 0;
		this.Index = function() { return i; };
		this.Count = function() { return sourceStr.length; };
		this.Done = function() { return i >= sourceStr.length; };
		this.Char = function() { return sourceStr[i]; };
		this.Step = function(n) { if(n===undefined) n=1; i += n; };
		this.MatchAhead = function(str) {
			// console.debug(str);
			str = "" + str; // hack to turn single chars into strings
			// console.debug(str);
			// console.debug(str.length);
			for (var j = 0; j < str.length; j++) {
				if (i + j >= sourceStr.length) {
					return false;
				}
				else if (str[j] != sourceStr[i+j]) {
					return false;
				}
			}
			return true;
		}
		this.Peak = function(end) {
			var str = "";
			var j = i;
			// console.debug(j);
			while (j < sourceStr.length && end.indexOf(sourceStr[j]) == -1) {
				str += sourceStr[j];
				j++;
			}
			// console.debug("PEAK ::" + str + "::");
			return str;
		}
		this.ConsumeBlock = function(open, close, includeSymbols) {
			if (includeSymbols === undefined || includeSymbols === null) {
				includeSymbols = false;
			}

			var startIndex = i;

			var matchCount = 0;
			if (this.MatchAhead(open)) {
				matchCount++;
				this.Step(open.length);
			}

			while (matchCount > 0 && !this.Done()) {
				if (this.MatchAhead(close)) {
					matchCount--;
					this.Step( close.length );
				}
				else if (this.MatchAhead(open)) {
					matchCount++;
					this.Step(open.length);
				}
				else {
					this.Step();
				}
			}

			if (includeSymbols) {
				return sourceStr.slice(startIndex, i);
			}
			else {
				return sourceStr.slice(startIndex + open.length, i - close.length);
			}
		}

		this.Print = function() { console.debug(sourceStr); };
		this.Source = function() { return sourceStr; };
	};

	/*
		ParseDialog():
		This function adds {print} nodes and linebreak {br} nodes to display text,
		interleaved with bracketed code nodes for functions and flow control,
		such as text effects {shk} {wvy} or sequences like {cycle} and {shuffle}.
		The parsing of those code blocks is handled by ParseCode.

		Note on parsing newline characters:
		- there should be an implicit linebreak {br} after each dialog line
		- a "dialog line" is defined as any line that either:
			- 1) contains dialog text (any text outside of a code block)
			- 2) is entirely empty (no text, no code)
			- *or* 3) contains a list block (sequence, cycle, shuffle, or conditional)
		- lines *only* containing {code} blocks are not dialog lines

		NOTE TO SELF: all the state I'm storing in here feels like
		evidence that the parsing system kind of broke down at this point :(
		Maybe it would feel better if I move into the "state" object
	*/
	function ParseDialog(state) {
		var curLineNodeList = [];
		var curText = "";
		var curLineIsEmpty = true;
		var curLineContainsDialogText = false;
		var prevLineIsDialogLine = false;

		var curLineIsDialogLine = function() {
			return curLineContainsDialogText || curLineIsEmpty;
		}

		var resetLineStateForNewLine = function() {
			prevLineIsDialogLine = curLineIsDialogLine();
			curLineContainsDialogText = false;
			curLineIsEmpty = true;
			curText = "";
			curLineNodeList = [];
		}

		var tryAddTextNodeToList = function() {
			if (curText.length > 0) {
				var printNode = new FuncNode("print", [new LiteralNode(curText)]);
				curLineNodeList.push(printNode);

				curText = "";
				curLineIsEmpty = false;
				curLineContainsDialogText = true;
			}
		}

		var addCodeNodeToList = function() {
			var codeSource = state.ConsumeBlock(Sym.CodeOpen, Sym.CodeClose);
			var codeState = new ParserState(new CodeBlockNode(), codeSource);
			codeState = ParseCode(codeState);
			var codeBlockNode = codeState.rootNode;
			curLineNodeList.push(codeBlockNode);
            curLineIsEmpty = false;

			// lists count as dialog text, because they can contain it
			if (isMultilineListBlock(codeBlockNode)) {
				curLineContainsDialogText = true;
			}
		}

		var tryAddLinebreakNodeToList = function() {
			if (prevLineIsDialogLine) {
				var linebreakNode = new FuncNode("br", []);
				curLineNodeList.unshift(linebreakNode);
			}
		}

		var addLineNodesToParent = function() {
			for (var i = 0; i < curLineNodeList.length; i++) {
				state.curNode.AddChild(curLineNodeList[i]);
			}
		}

		while (!state.Done()) {
			if (state.MatchAhead(Sym.CodeOpen)) { // process code block
				// add any buffered text to a print node, and parse the code
				tryAddTextNodeToList();
				addCodeNodeToList();
			}
			// else if (state.MatchAhead(Sym.Linebreak)) { // process new line
			// 	// add any buffered text to a print node, 
			// 	// and add a linebreak if we are between two dialog lines
			// 	tryAddTextNodeToList();
			// 	tryAddLinebreakNodeToList();

			// 	// since we've reached the end of a line
			// 	// add stored nodes for this line to the parent node we are building,
			// 	// and reset state for the next line
			// 	addLineNodesToParent();
			// 	resetLineStateForNewLine();

			// 	state.Step();
			// }
			else {
				// continue adding text to the current text buffer
				curText += state.Char();
				state.Step();
			}
		}

		// to make sure we don't leave anything behind:
		// add buffered text to a print node and add all nodes
		// to the current parent node
		tryAddTextNodeToList();
		tryAddLinebreakNodeToList();
		addLineNodesToParent();

		return state;
	}

	function ParseDialogBlock(state) {
		var dialogStr = state.ConsumeBlock( Sym.DialogOpen, Sym.DialogClose );

		var dialogState = new ParserState(new DialogBlockNode(), dialogStr);
		dialogState = ParseDialog( dialogState );

		state.curNode.AddChild( dialogState.rootNode );

		return state;
	}

	/*
		ParseConditional():
		A conditional contains a list of conditions that can be
		evaluated to true or false, followed by more dialog
		that will be evaluated if the condition is true. The first
		true condition is the one that gets evaluated.
	*/
	function ParseConditional(state) {
		var conditionStrings = [];
		var resultStrings = [];
		var curIndex = -1;
		var requiredLeadingWhitespace = -1;

		// TODO : very similar to sequence parsing - can we share anything?
		function parseConditionalItemLine(state) {
			var lineText = "";
			var whitespaceCount = 0;
			var isNewCondition = false;
			var encounteredNonWhitespace = false;
			var encounteredConditionEnd = false;

			while (!state.Done() && !(state.Char() === Sym.Linebreak)) {
				// count whitespace until we hit the first non-whitespace character
				if (!encounteredNonWhitespace) {
					if (state.Char() === " " || state.Char() === "\t") {
						whitespaceCount++;
					}
					else {
						encounteredNonWhitespace = true;

						if (state.Char() === Sym.List) {
							isNewCondition = true;
							whitespaceCount += 2; // count the list seperator AND the following extra space
						}
					}
				}

				// if this is the condition, we need to track whether we've
				// reached the end of the condition
				if (isNewCondition && !encounteredConditionEnd) {
					if (state.Char() === Sym.ConditionEnd) {
						encounteredConditionEnd = true;
					}
				}

				// add characters one at a time, unless it's a code block
				// since code blocks can contain additional sequences inside
				// them that will mess up our list item detection
				if (state.Char() === Sym.CodeOpen) {
					lineText += state.ConsumeBlock(Sym.CodeOpen, Sym.CodeClose, true /*includeSymbols*/);
				}
				else {
					if (!encounteredConditionEnd) { // skip all characters including & after the condition end
						lineText += state.Char();
					}
					state.Step();
				}
			}

			if (state.Char() === Sym.Linebreak) {
				state.Step();
			}

			return { text:lineText, whitespace:whitespaceCount, isNewCondition:isNewCondition };
		}

		// TODO : this is copied from sequence parsing; share?
		function trimLeadingWhitespace(text, trimLength) {
			var textSplit = text.split(Sym.linebreak);
			textSplit = textSplit.map(function(line) { return line.slice(trimLength) });
			return textSplit.join(Sym.linebreak);
		}

		while (!state.Done()) {
			var lineResults = parseConditionalItemLine(state);

			if (lineResults.isNewCondition) {
				requiredLeadingWhitespace = lineResults.whitespace;
				curIndex++;
				conditionStrings[curIndex] = "";
				resultStrings[curIndex] = "";
			}

			// to avoid extra newlines in nested conditionals, only count lines
			// that at least match the whitespace count of the initial line
			// NOTE: see the comment in sequence parsing for more details
			if (lineResults.whitespace >= requiredLeadingWhitespace) {
				var trimmedText = trimLeadingWhitespace(lineResults.text, requiredLeadingWhitespace);

				if (lineResults.isNewCondition) {
					conditionStrings[curIndex] += trimmedText;
				}
				else {
					resultStrings[curIndex] += trimmedText + Sym.Linebreak;
				}
			}
		}

		// hack: cut off the trailing newlines from all the result strings
		resultStrings = resultStrings.map(function(result) { return result.slice(0,-1); });

		var conditions = [];
		for (var i = 0; i < conditionStrings.length; i++) {
			var str = conditionStrings[i].trim();
			if (str === Sym.Else) {
				conditions.push(new ElseNode());
			}
			else {
				var exp = CreateExpression(str);
				conditions.push(exp);
			}
		}

		var results = [];
		for (var i = 0; i < resultStrings.length; i++) {
			var str = resultStrings[i];
			var dialogBlockState = new ParserState(new DialogBlockNode(), str);
			dialogBlockState = ParseDialog(dialogBlockState);
			var dialogBlock = dialogBlockState.rootNode;
			results.push(dialogBlock);
		}

		state.curNode.AddChild(new IfNode(conditions, results));

		return state;
	}

	function IsSequence(str) {
		// console.debug("IsSequence? " + str);
		return str === "sequence" || str === "cycle" || str === "shuffle";
	}

	/*
		ParseSequence():
		Sequence nodes contain a list of dialog block nodes. The order those
		nodes are evaluated is determined by the type of sequence:
		- sequence: each child node evaluated once in order
		- cycle: repeats from the beginning after all nodes evaluate
		- shuffle: evaluate in a random order

		Each item in a sequence is sepearated by a "-" character.
		The seperator must come at the beginning of the line,
		but may be preceded by whitespace (in any amount).

		About whitespace: Whitespace at the start of a line
		is ignored if it less than or equal to the count of
		whitespace that preceded the list separator ("-") at
		the start of that item. (The count also includes the
		seperator and the extra space after the seperator.)
	 */
	function ParseSequence(state, sequenceType) {
		var itemStrings = [];
		var curItemIndex = -1; // -1 indicates not reading an item yet
		var requiredLeadingWhitespace = -1;

		function parseSequenceItemLine(state) {
			var lineText = "";
			var whitespaceCount = 0;
			var isNewListItem = false;
			var encounteredNonWhitespace = false;

			while (!state.Done() && !(state.Char() === Sym.Linebreak)) {
				// count whitespace until we hit the first non-whitespace character
				if (!encounteredNonWhitespace) {
					if (state.Char() === " " || state.Char() === "\t") {
						whitespaceCount++;
					}
					else {
						encounteredNonWhitespace = true;

						if (state.Char() === Sym.List) {
							isNewListItem = true;
							whitespaceCount += 2; // count the list seperator AND the following extra space
						}
					}
				}

				// add characters one at a time, unless it's a code block
				// since code blocks can contain additional sequences inside
				// them that will mess up our list item detection
				if (state.Char() === Sym.CodeOpen) {
					lineText += state.ConsumeBlock(Sym.CodeOpen, Sym.CodeClose, true /*includeSymbols*/);
				}
				else {
					lineText += state.Char();
					state.Step();
				}
			}

			if (state.Char() === Sym.Linebreak) {
				state.Step();
			}

			return { text:lineText, whitespace:whitespaceCount, isNewListItem:isNewListItem };
		}

		function trimLeadingWhitespace(text, trimLength) {
			// the split and join is necessary because a single "line"
			// can contain sequences that may contain newlines of their own
			// (we treat them all as one "line" for sequence parsing purposes)
			var textSplit = text.split(Sym.linebreak);
			textSplit = textSplit.map(function(line) { return line.slice(trimLength) });
			return textSplit.join(Sym.linebreak);
		}

		while (!state.Done()) {
			var lineResults = parseSequenceItemLine(state);

			if (lineResults.isNewListItem) {
				requiredLeadingWhitespace = lineResults.whitespace;
				curItemIndex++;
				itemStrings[curItemIndex] = "";
			}

			// to avoid double counting closing lines (empty ones ending in a curly brace)
			// we only allow lines that have at least as much whitespace as the start of the list item
			// TODO : I think right now this leads to a bug if the list item's indentation is less than
			// its parent code block... hopefully that won't be a big deal for now
			// (NOTE: I think the bug could be fixed by only applying this to the FINAL line of an item, but
			// that would require more consideration and testing)
			if (lineResults.whitespace >= requiredLeadingWhitespace) {
				var trimmedText = trimLeadingWhitespace(lineResults.text, requiredLeadingWhitespace);
				itemStrings[curItemIndex] += trimmedText + Sym.Linebreak;
			}
		}

		// a bit hacky: cut off the trailing newlines from all the items
		itemStrings = itemStrings.map(function(item) { return item.slice(0,-1); });

		var options = [];
		for (var i = 0; i < itemStrings.length; i++) {
			var str = itemStrings[i];
			var dialogBlockState = new ParserState(new DialogBlockNode(false /* doIndentFirstLine */), str);
			dialogBlockState = ParseDialog(dialogBlockState);
			var dialogBlock = dialogBlockState.rootNode;
			options.push(dialogBlock);
		}

		if (sequenceType === "sequence") {
			state.curNode.AddChild(new SequenceNode(options));
		}
		else if (sequenceType === "cycle") {
			state.curNode.AddChild(new CycleNode(options));
		}
		else if (sequenceType === "shuffle") {
			state.curNode.AddChild(new ShuffleNode(options));
		}

		return state;
	}

	function ParseFunction(state, funcName) {
		console.debug("~~~ PARSE FUNCTION " + funcName);

		var args = [];

		var curSymbol = "";
		function OnSymbolEnd() {
			curSymbol = curSymbol.trim();
			// console.debug("PARAMTER " + curSymbol);
			args.push( StringToValue(curSymbol) );
			// console.debug(args);
			curSymbol = "";
		}

		while( !( state.Char() === "\n" || state.Done() ) ) {
			if( state.MatchAhead(Sym.CodeOpen) ) {
				var codeBlockState = new ParserState(new CodeBlockNode(), state.ConsumeBlock(Sym.CodeOpen, Sym.CodeClose));
				codeBlockState = ParseCode( codeBlockState );
				var codeBlock = codeBlockState.rootNode;
				args.push( codeBlock );
				curSymbol = "";
			}
			else if( state.MatchAhead(Sym.String) ) {
				/* STRING LITERAL */
				var str = state.ConsumeBlock(Sym.String, Sym.String);
				// console.debug("STRING " + str);
				args.push( new LiteralNode(str) );
				curSymbol = "";
			}
			else if(state.Char() === " " && curSymbol.length > 0) {
				OnSymbolEnd();
			}
			else {
				curSymbol += state.Char();
			}
			state.Step();
		}

		if(curSymbol.length > 0) {
			OnSymbolEnd();
		}

		state.curNode.AddChild( new FuncNode( funcName, args ) );

		return state;
	}

	function IsValidVariableName(str) {
		var reg = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
		var isValid = reg.test(str);
		// console.debug("VALID variable??? " + isValid);
		return isValid;
	}

	function StringToValue(valStr) {
		if(valStr[0] === Sym.CodeOpen) {
			// CODE BLOCK!!!
			var codeStr = (new ParserState( null, valStr )).ConsumeBlock(Sym.CodeOpen, Sym.CodeClose); //hacky
			var codeBlockState = new ParserState(new CodeBlockNode(), codeStr);
			codeBlockState = ParseCode( codeBlockState );
			return codeBlockState.rootNode;
		}
		else if(valStr[0] === Sym.String) {
			// STRING!!
			// console.debug("STRING");
			var str = "";
			var i = 1;
			while (i < valStr.length && valStr[i] != Sym.String) {
				str += valStr[i];
				i++;
			}
			// console.debug(str);
			return new LiteralNode( str );
		}
		else if(valStr === "true") {
			// BOOL
			return new LiteralNode( true );
		}
		else if(valStr === "false") {
			// BOOL
			return new LiteralNode( false );
		}
		else if( !isNaN(parseFloat(valStr)) ) {
			// NUMBER!!
			// console.debug("NUMBER!!! " + valStr);
			return new LiteralNode( parseFloat(valStr) );
		}
		else if(IsValidVariableName(valStr)) {
			// VARIABLE!!
			// console.debug("VARIABLE");
			return new VarNode(valStr); // TODO : check for valid potential variables
		}
		else {
			// uh oh
			return new LiteralNode(null);
		}
	}

	function CreateExpression(expStr) {
		expStr = expStr.trim();

		function IsInsideString(index) {
			var inString = false;
			for(var i = 0; i < expStr.length; i++) {
				if(expStr[i] === Sym.String)
					inString = !inString;

				if(index === i)
					return inString;
			}
			return false;
		}

		function IsInsideCode(index) {
			var count = 0;
			for(var i = 0; i < expStr.length; i++) {
				if(expStr[i] === Sym.CodeOpen)
					count++;
				else if(expStr[i] === Sym.CodeClose)
					count--;

				if(index === i)
					return count > 0;
			}
			return false;
		}

		var operator = null;

		// set is special because other operator can look like it, and it has to go first in the order of operations
		var setIndex = expStr.indexOf(Sym.Set);
		if( setIndex > -1 && !IsInsideString(setIndex) && !IsInsideCode(setIndex) ) { // it might be a set operator
			if( expStr[setIndex+1] != "=" && expStr[setIndex-1] != ">" && expStr[setIndex-1] != "<" ) {
				// ok it actually IS a set operator and not ==, >=, or <=
				operator = Sym.Set;
				var variableName = expStr.substring(0,setIndex).trim(); // TODO : valid variable name testing
				var left = IsValidVariableName(variableName) ? new VarNode( variableName ) : new LiteralNode(null);
				var right = CreateExpression( expStr.substring(setIndex+Sym.Set.length) );
				var exp = new ExpNode( operator, left, right );
				return exp;
			}
		}

		// special if "expression" for single-line if statements
		var ifIndex = expStr.indexOf(Sym.ConditionEnd);
		if( ifIndex > -1 && !IsInsideString(ifIndex) && !IsInsideCode(ifIndex) ) {
			operator = Sym.ConditionEnd;
			var conditionStr = expStr.substring(0,ifIndex).trim();
			var conditions = [ CreateExpression(conditionStr) ];

			var resultStr = expStr.substring(ifIndex+Sym.ConditionEnd.length);
			var results = [];
			function AddResult(str) {
				var dialogBlockState = new ParserState(new DialogBlockNode(), str);
				dialogBlockState = ParseDialog( dialogBlockState );
				var dialogBlock = dialogBlockState.rootNode;
				results.push( dialogBlock );
			}

			var elseIndex = resultStr.indexOf(Sym.ElseExp); // does this need to test for strings?
			if(elseIndex > -1) {
				conditions.push( new ElseNode() );

				var elseStr = resultStr.substring(elseIndex+Sym.ElseExp.length);
				var resultStr = resultStr.substring(0,elseIndex);

				AddResult( resultStr.trim() );
				AddResult( elseStr.trim() );
			}
			else {
				AddResult( resultStr.trim() );
			}

			return new IfNode( conditions, results, true /*isSingleLine*/ );
		}

		for( var i = 0; (operator == null) && (i < Sym.Operators.length); i++ ) {
			var opSym = Sym.Operators[i];
			var opIndex = expStr.indexOf( opSym );
			if( opIndex > -1 && !IsInsideString(opIndex) && !IsInsideCode(opIndex) ) {
				operator = opSym;
				var left = CreateExpression( expStr.substring(0,opIndex) );
				var right = CreateExpression( expStr.substring(opIndex+opSym.length) );
				var exp = new ExpNode( operator, left, right );
				return exp;
			}
		}

		if( operator == null ) {
			return StringToValue(expStr);
		}
	}
	this.CreateExpression = CreateExpression;

	function IsWhitespace(str) {
		return ( str === " " || str === "\t" || str === "\n" );
	}

	function IsExpression(str) {
		var tempState = new ParserState(null, str); // hacky
		var textOutsideCodeBlocks = "";

		while (!tempState.Done()) {
			if (tempState.MatchAhead(Sym.CodeOpen)) {
				tempState.ConsumeBlock(Sym.CodeOpen, Sym.CodeClose);
			}
			else {
				textOutsideCodeBlocks += tempState.Char();
				tempState.Step();
			}
		}

		var containsAnyExpressionOperators = (textOutsideCodeBlocks.indexOf(Sym.ConditionEnd) != -1) ||
				(textOutsideCodeBlocks.indexOf(Sym.Set) != -1) ||
				(Sym.Operators.some(function(opSym) { return textOutsideCodeBlocks.indexOf(opSym) != -1; }));

		return containsAnyExpressionOperators;
	}

	function IsLiteral(str) {
		var isBool = str === "true" || str === "false";
		var isNum = !isNaN(parseFloat(str));
		var isStr = str[0] === '"' && str[str.length-1] === '"';
		var isVar = IsValidVariableName(str);
		var isEmpty = str.length === 0;
		return isBool || isNum || isStr || isVar || isEmpty;
	}

	function ParseExpression(state) {
		var line = state.Source(); // state.Peak( [Sym.Linebreak] ); // TODO : remove the linebreak thing
		// console.debug("EXPRESSION " + line);
		var exp = CreateExpression(line);
		// console.debug(exp);
		state.curNode.AddChild(exp);
		state.Step(line.length);
		return state;
	}

	function IsConditionalBlock(state) {
		var peakToFirstListSymbol = state.Peak([Sym.List]);

		var foundListSymbol = peakToFirstListSymbol < state.Source().length;

		var areAllCharsBeforeListWhitespace = true;
		for (var i = 0; i < peakToFirstListSymbol.length; i++) {
			if (!IsWhitespace(peakToFirstListSymbol[i])) {
				areAllCharsBeforeListWhitespace = false;
			}
		}

		var peakToFirstConditionSymbol = state.Peak([Sym.ConditionEnd]);
		peakToFirstConditionSymbol = peakToFirstConditionSymbol.slice(peakToFirstListSymbol.length);
		var hasNoLinebreakBetweenListAndConditionEnd = peakToFirstConditionSymbol.indexOf(Sym.Linebreak) == -1;

		return foundListSymbol && 
			areAllCharsBeforeListWhitespace && 
			hasNoLinebreakBetweenListAndConditionEnd;
	}

	function ParseCode(state) {
		if (IsConditionalBlock(state)) {
			state = ParseConditional(state);
		}
		else if (environment.HasFunction(state.Peak([" "]))) { // TODO --- what about newlines???
			var funcName = state.Peak([" "]);
			state.Step(funcName.length);
			state = ParseFunction(state, funcName);
		}
		else if (IsSequence(state.Peak([" ", Sym.Linebreak]))) {
			var sequenceType = state.Peak([" ", Sym.Linebreak]);
			state.Step(sequenceType.length);
			state = ParseSequence(state, sequenceType);
		}
		else if (IsLiteral(state.Source()) || IsExpression(state.Source())) {
			state = ParseExpression(state);
		}
		else {
			var undefinedSrc = state.Peak([]);
			var undefinedNode = new UndefinedNode(undefinedSrc);
			state.curNode.AddChild(undefinedNode);
		}

		// just go to the end now
		while (!state.Done()) {
			state.Step();
		}

		return state;
	}

	function ParseCodeBlock(state) {
		var codeStr = state.ConsumeBlock( Sym.CodeOpen, Sym.CodeClose );
		var codeState = new ParserState(new CodeBlockNode(), codeStr);
		codeState = ParseCode( codeState );
		state.curNode.AddChild( codeState.rootNode );
		return state;
	}

}

} // Script()