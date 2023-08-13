import { MikeBASICCompiler } from "./mikebasic.js";
import { FruitflyCodeMirrorCompilerEditor } from "./codemirroreditor.js";
import { FruitflyEmulator } from "./emulator.js";
import { UIController } from "./editor.js";
// set default program

const editor = new FruitflyCodeMirrorCompilerEditor(
    document.getElementById("thing"),
    document.getElementById("errorContainer"),
    document.getElementById("downloadlink")
);

editor.attach();
editor.setOnCompiledListener(function (data) {
    emulator.insertCartridge(data);
});

const emulator = new FruitflyEmulator(
    document.getElementById("canvasid"),
    document.getElementById("mystatus")
);
emulator.setDebugCommandsets(
    document.getElementById("btnradio1"),
    document.getElementById("btnradio2")
);
emulator.attach();
document
    .getElementById("inputGroupFile03")
    .addEventListener("change", function (evt) {
        var file = evt.target.files[0];
        let reader = new FileReader();
        reader.addEventListener("loadend", function (e) {
            var data = new Uint16Array(e.target.result);
            emulator.insertCartridge(data);
        });
        reader.readAsArrayBuffer(file);
    });

editor.fire();

const mbcompiler = new MikeBASICCompiler(
    document.getElementById("mbeditor"),
    document.getElementById("errorContainer")
);
mbcompiler.attach();
mbcompiler.setOnCompiledListener(function (data) {
    editor.offer(data);
});

const uiController = new UIController(emulator,editor.compiler);
uiController.init();

samplesModalSpawner.addEventListener("click",function(evt){
    fetch("https://api.github.com/repos/AdeRegt/FruitflyPrograms/git/trees/main?recursive=1").then(function(result){
        return result.json();
    }).then(function(result){
        var tree = result.tree;
        examplelist.innerHTML = "";
        for(var i = 0 ; i < tree.length ; i++){
            var thisone = tree[i];
            var but = document.createElement("button");
            but.setAttribute("type","button");
            but.setAttribute("class","list-group-item list-group-item-action");
            but.setAttribute("upath",thisone.url);
            but.innerHTML = thisone.path;
            but.addEventListener("click",function(evt){
                fetch(this.getAttribute("upath")).then(function(udi){
                    return udi.json();
                }).then(function(js){
                    var content = atob(js.content);
                    editor.setEditorsContent(content);
                    editor.fire();
                });
            });
            examplelist.appendChild(but);
        }
    });
});
