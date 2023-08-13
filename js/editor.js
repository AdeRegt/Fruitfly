import { FruitflyEmulator } from "./emulator.js";
import { FruitflyCompiler } from "./compiler.js";
import { toHexString } from "./utils.js";

export const DEFAULT_PROGRAM = `
  call main
  exit 1
main:
  syscall print_structure
  return 

print_structure:
  dump 1
  dump "hello world"
`;

export class FruitflyAbstractCompilerEditor {
    
    constructor(errorContainerEl, downloadLink){
        this.compiler = new FruitflyCompiler();
        this.onCompiled = null;
        this.errorContainerEl = errorContainerEl;
        this.downloadLink = downloadLink;
    }

    getCompiler(){
        return this.compiler;
    }

    offer(sourceCode) {
        this.getCompiler().setSource(sourceCode);

        const res = this.getCompiler().compile();
        this.setMessage(this.getCompiler().getErrors().join("<br/>"));

        // when the program is invalid we block the download button
        if (res === false) {
            this.downloadLink.classList.add("disabled");
            return;
        }

        this.downloadLink.href = res;
        this.downloadLink.download = "test.sxe";
        this.downloadLink.classList.remove("disabled");
        this.onCompiled(this.getCompiler().generateUint16DataArray());
    }

    setOnCompiledListener(fun) {
        this.onCompiled = fun;
    }

    setMessage(message) {
        this.errorContainerEl.innerHTML = message;
    }

    getEditorsContent() {
        return "";
    }

    fireEvent(){
        const sourceCode = this.getEditorsContent();
        this.offer(sourceCode);
    }


}

export class FruitflyCompilerEditor extends FruitflyAbstractCompilerEditor{

    constructor(textarea,errorContainerEl, downloadLink) {
        super(errorContainerEl, downloadLink);
        this.textarea = textarea;
    }

    getEditorsContent() {
        return this.textarea.value.trim();
    }

    fire() {
        this.textarea.dispatchEvent(new Event("keyup"));
    }

    attach() {
        this.textarea.addEventListener("keyup", this.fireEvent.bind(this));
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

export class UIController {
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
     * @param {FruitflyCompiler} compiler
     */
    constructor(emulator,compiler) {
        this.emulator = emulator;
        this.compiler = compiler;

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
        
        var watchinfos = this.compiler.getWatchInformation();
        var watchhead = document.querySelector("#watch-table tbody");
        watchhead.innerHTML = "";
        for (const watch in watchinfos) {
            if (Object.hasOwnProperty.call(watchinfos, watch)) {
                const element = watchinfos[watch];
                const memval = this.emulator.memory[element];
                const memname = watch;

                var rowmaster = document.createElement("tr");
                rowmaster.classList.add("memory-cell");
                var cellA = document.createElement("td");
                var cellB = document.createElement("td");
                cellA.innerHTML = memname;
                cellB.innerHTML = toHexString(memval);
                rowmaster.appendChild(cellA);
                rowmaster.appendChild(cellB);
                watchhead.appendChild(rowmaster);
            }
        }
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

