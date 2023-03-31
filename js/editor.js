import { FruitflyEmulator } from "./emulator.js";
import { FruitflyCompiler } from "./compiler.js";
import { toHexString } from "./utils.js";
import { MikeBASICCompiler } from "./mikebasic.js";

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

    offer(sourceCode) {
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
    }

    attach() {
        this.textarea.addEventListener("keyup", () => {
            const sourceCode = this.getEditorsContent();
            this.offer(sourceCode);
        });
    }
}

/**
 * Create a new table cell.
 *
 * @param {string[]} classes
 * @returns
 */
const createCell = (classes) => {
    const newCell = document.createElement("td");
    const newSpan = document.createElement("span");
    newSpan.classList.add(...classes);
    newCell.append(newSpan);

    return newCell;
};

class UIController {
    /**
     * Array of the <tr> DOM elements used to display memory.
     *
     * @type {HTMLElement[]}
     */
    memoryRows = Array(16).fill(null);

    /**
     * @type {{up: HTMLButtonElement, down: HTMLButtonElement, jumpToPc: HTMLButtonElement}}
     */
    memoryButtons = {
        up: null,
        down: null,
        jumpToPc: null,
    };

    /**
     * Object with the span elements correspondent to each register.
     */
    registers = {
        pc: document.getElementById("register_ip_show"),
        a: document.getElementById("register_a_show"),
        b: document.getElementById("register_b_show"),
        opcode: document.getElementById("register_opcode_show"),
        argument: document.getElementById("register_argument_show"),
        stack: document.getElementById("register_stack_show"),
        state: document.getElementById("register_ir_show"),
        ticks: document.getElementById("register_tc_show"),
        lastError: document.getElementById("register_le_show"),
    };

    /**
     * Current memory location shown on the memory table.
     */
    currentMemoryLocation = 0;

    /**
     *
     * @param {FruitflyEmulator} emulator
     */
    constructor(emulator) {
        this.emulator = emulator;

        this.currentMemoryLocation = this.emulator.registers.pc;
    }

    init() {
        this.initMemoryDisplay();

        // Listen for emulator state changes to we can update the UI accordingly
        this.emulator.addListener(this.emulatorEventHandler.bind(this));
    }

    emulatorEventHandler({ event, data }) {
        if (event === "regset") {
            if (data.register === "pc") {
                this.refreshMemoryDisplay();
            }

            this.refreshRegisters();
        } else if (event === "tick") {
            this.registers.ticks.textContent = data.count;
        } else if (event === "state") {
            this.refreshRegisters();
        }
    }

    initMemoryDisplay() {
        const tableBody = document.querySelector("#memory-table tbody");
        this.memoryButtons = {
            up: document.getElementById("memory-page-up"),
            down: document.getElementById("memory-page-down"),
            jumpToPc: document.getElementById("jump-to-pc"),
        };

        this.memoryButtons.up.addEventListener("click", () =>
            this.handleMemoryPageChange(false)
        );
        this.memoryButtons.down.addEventListener("click", () =>
            this.handleMemoryPageChange(true)
        );
        this.memoryButtons.jumpToPc.addEventListener("click", () =>
            this.handleJumpToPC()
        );

        this.memoryRows = this.memoryRows.map(() => {
            const row = document.createElement("tr");
            row.classList.add("memory-cell");

            row.append(createCell(["memory-address", "hex-value"]));
            row.append(createCell(["memory-hex"]));
            row.append(createCell(["memory-instruction"]));
            tableBody.append(row);

            return row;
        });

        this.displayMemory(this.currentMemoryLocation);
    }

    /**
     *
     * @param {number} startPosition
     */
    displayMemory(startPosition) {
        const memoryMax = this.emulator.memory.length - this.memoryRows.length;

        if (startPosition >= memoryMax) {
            startPosition = max;
            this.memoryButtons.down.setAttribute("disabled", true);
        } else {
            this.memoryButtons.down.removeAttribute("disabled");
        }

        if (startPosition <= 0) {
            startPosition = 0;
            this.memoryButtons.up.setAttribute("disabled", true);
        } else {
            this.memoryButtons.up.removeAttribute("disabled");
        }

        this.currentMemoryLocation = startPosition;

        this.memoryRows.forEach((row, index) => {
            const address = startPosition + index;
            const data = this.emulator.memory[address];

            if (address === this.emulator.registers.pc) {
                row.classList.add("table-primary");
            } else {
                row.classList.remove("table-primary");
            }

            row.querySelector(".memory-address").textContent =
                toHexString(address);
            row.querySelector(".memory-hex").textContent = toHexString(data);
            row.querySelector(".memory-instruction").textContent =
                this.emulator.opcodeAddressToString(address);
        });
    }

    refreshMemoryDisplay() {
        this.displayMemory(this.currentMemoryLocation);
    }

    refreshRegisters() {
        this.registers.a.textContent = toHexString(this.emulator.registers.a);
        this.registers.b.textContent = toHexString(this.emulator.registers.b);
        this.registers.pc.textContent = toHexString(this.emulator.registers.pc);

        this.registers.opcode.textContent = toHexString(
            this.emulator.current_opcode
        );
        this.registers.argument.textContent = toHexString(
            this.emulator.current_argument
        );

        this.registers.state.textContent = this.emulator.isRunning
            ? "Running"
            : "Stopped";
        this.registers.ticks.textContent = this.emulator.ticksSinceBoot;
        this.registers.lastError.value = this.emulator.lastError;
    }

    handleMemoryPageChange(isDirectionDown) {
        const numberOfPositionToScroll = this.memoryRows.length;

        if (isDirectionDown) {
            this.displayMemory(
                this.currentMemoryLocation + numberOfPositionToScroll
            );
        } else {
            this.displayMemory(
                this.currentMemoryLocation - numberOfPositionToScroll
            );
        }
    }

    handleJumpToPC() {
        this.displayMemory(this.emulator.registers.pc);
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
emulator.setDebugCommandsets(
    document.getElementById("btnradio1"),
    document.getElementById("btnradio2")
);
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

const uiController = new UIController(emulator);
uiController.init();
