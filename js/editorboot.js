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
