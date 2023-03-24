import { FruitflyEmulator } from "./emulator.js";
import { FruitflyCompiler } from "./compiler.js";

const DEFAULT_PROGRAM = `
  call main
  exit 1
main:
  syscall print_structure
  return 

print_structure:
  dump 1
  dump "hello world"
`;

class FruitflyCompilerEditor {
    compiler = new FruitflyCompiler();

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
            this.compiler.setSource(sourceCode);

            const res = this.compiler.compile();
            this.setMessage(this.compiler.getErrors().join("<br/>"));

            // when the program is invalid we block the download button
            if (res === false) {
                this.downloadLink.classList.add("disabled");
                return;
            }

            this.downloadLink.href = res;
            this.downloadLink.download = "test.sxe";
            this.downloadLink.classList.remove("disabled");
            this.onCompiled(this.compiler.generateUint16DataArray());
        });
    }
}

// set default program
document.getElementById("thing").value = DEFAULT_PROGRAM;

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
        emulator.insertCartridge(editor.compiler.generateUint16DataArray());
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
emulator.setRegisterInfo(
    document.getElementById("register_ip_show"),
    document.getElementById("register_a_show"),
    document.getElementById("register_b_show"),
    document.getElementById("register_opcode_show"),
    document.getElementById("register_argument_show"),
    document.getElementById("register_stack_show"),
    document.getElementById("register_le_show"),
    document.getElementById("register_ir_show"),
    document.getElementById("register_tc_show")
);
editor.fire();
