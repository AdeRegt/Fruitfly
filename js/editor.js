import { FruitflyEmulator } from "./emulator.js";
import { FruitflyCompiler } from "./compiler.js";

class FruitflyCompilerEditor {
    emulator = new FruitflyCompiler();

    onCompiled = () => null;

    constructor(textarea, errorContainerEl, downloadLink) {
        this.textarea = textarea;
        this.errorContainerEl = errorContainerEl;
        this.downloadLink = downloadLink;
    }

    getEditorsContent() {
        return this.textarea.value.trim();
    }

    setMessage(message) {
        this.errorContainerEl.innerHTML = message;
    }

    setOnCompiledListener(fun) {
        this.onCompiled = fun;
    }

    fire() {
        this.textarea.dispatchEvent(new Event("keyup"));
    }

    attach() {
        this.textarea.addEventListener("keyup", () => {
            const sourceCode = this.getEditorsContent();
            this.emulator.setSource(sourceCode);

            const res = this.emulator.compile();
            this.setMessage(this.emulator.getErrors().join("<br/>"));

            // when the program is invalid we block the download button
            if (res === false) {
                this.downloadLink.classList.add("disabled");
                return;
            }

            this.downloadLink.href = res;
            this.downloadLink.download = "test.sxe";
            this.downloadLink.classList.remove("disabled");
            this.onCompiled(this.emulator.generateUint16DataArray());
        });
    }
}

const editor = new FruitflyCompilerEditor(
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
document
    .getElementById("inputGroupFileAddon03")
    .addEventListener("click", function () {
        emulator.insertCartridge(editor.generateUint16DataArray());
    });
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
