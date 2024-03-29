import { opcodes, opcodeToString } from "./opcodes.js";

export class FruitflyEmulator {
    operations = {
        [opcodes.NOP]: this.doNop,
        [opcodes.JNE]: this.doJNE,
        [opcodes.JL]: this.doJL,
        [opcodes.JM]: this.doJM,
        [opcodes.JE]: this.doJE,
        [opcodes.FLAGS]: this.doMath,
        [opcodes.JUMP]: this.doJump,
        [opcodes.RB2A]: this.doRB2A,
        [opcodes.RA2A]: this.doRA2A,
        [opcodes.A2RB]: this.doA2RB,
        [opcodes.A2RA]: this.doA2RA,
        [opcodes.CALL]: this.doCall,
        [opcodes.V2RA]: this.doV2RA,
        [opcodes.SYSCALL]: this.doSystemCall,
        [opcodes.V2RB]: this.doV2RB,
        [opcodes.EXIT]: this.doExit,
    };

    /**
     * Listeners for any memory change.
     *
     * @type {Array<(event: {type: string, data: any}) => void>}
     */
    listeners = [];

    registers = {
        a: 0,
        b: 0,
        c: 0,
        d: 0,
        e: 0,
        f: 0,
        pc: 0,
    };

    constructor(canvas, status) {
        this.rawcanvas = canvas;
        this.rawstatus = status;
        this.memory = new Uint16Array(4103);
        this.callstack = [];
        this.stack = [];
        this.current_opcode = 0;
        this.current_argument = 0;
        this.isRunning = false;
        this.lastError = null;
        this.onexit = null;
        this.ticksSinceBoot = 0;
        this.timer = null;
        this.lastKeyCode = null;
    }

    getRegisterById(vrt){
        return ["a","b","c","d","e","f"][vrt];
    }

    attach(){
        var innerme = this;
        document.body.addEventListener("keydown",function(evt){
            innerme.lastKeyCode = evt.keyCode;
        });
    }

    setDebugCommandsets(run,step){
        this.is_run_button = run;
        this.step_button = step;
        var innerme = this;
        this.step_button.addEventListener("click",function(){
            innerme.is_run_button.checked = true;
            innerme.tick();
            innerme.is_run_button.checked = false;
        });
    }

    setRegister(register, value) {
        this.registers[register] = value;
        this.notifyListeners({
            event: "regset",
            data: {
                register,
                value,
            },
        });
    }

    /**
     * Registers a new listener for emulator events.
     *
     * @param {(event: {type: string, data: any}) => void} newListener
     */
    addListener(newListener) {
        this.listeners.push(newListener);
    }

    /**
     * Send an event to all registered listeners.
     *
     * @param {{type: string, data: any}} event
     */
    notifyListeners(event) {
        this.listeners.forEach((listener) => listener(event));
    }

    setStatus(message) {
        this.rawstatus.value = message;
    }

    getStatus() {
        return this.rawstatus.value;
    }

    setOnExitListener(fun) {
        this.onexit = fun;
    }

    formatString(ind) {
        if (typeof ind === "undefined") {
            return "Error";
        }
        if (Number.isNaN(ind)) {
            return "Error";
        }
        var t = ind;
        while (t.length < len) {
            t = "0" + t;
        }
        return t;
    }

    stop() {
        this.isRunning = false;
        window.clearInterval(this.timer);

        this.notifyListeners({
            event: "state",
            data: {
                state: "stopped",
            },
        });
    }

    grabNextInstruction(){
        this.current_opcode_set = this.memory[this.registers.pc];
        this.current_opcode = this.getOpcodeFromInstruction(
            this.current_opcode_set
        );
        this.current_argument = this.getInstructionArguments(
            this.current_opcode_set
        );
    }

    tick() {

        if(!this.is_run_button.checked){
            return;
        }

        this.ticksSinceBoot++;

        if (!this.isRunning) {
            return;
        }

        if (this.memory[0] === 0) {
            return;
        }

        this.grabNextInstruction();

        if (!this.operations[this.current_opcode]) {
            this.lastError = `Unknown opcode: ${this.current_opcode}`;
            this.stop();
            return;
        }

        this.operations[this.current_opcode].call(this);
        this.notifyListeners({
            event: "tick",
            data: { count: this.ticksSinceBoot },
        });
    }

    doExit() {
        this.stop();

        if (this.onexit != null) {
            this.onexit(this.current_argument);
        }
    }

    doNop() {
        this.setRegister("pc", this.registers.pc + 1);
    }

    doDebug() {
        window.alert(JSON.stringify(this.registers));
    }

    doSystemCall() {
        var syscallid = this.memory[this.current_argument];
        if (syscallid == 1) {
            var i = 1;
            var str = "";
            while (true) {
                var g = this.memory[this.current_argument + i];
                var low = g & 0x00ff;
                var high = (g & 0xff00) / 0x100;
                if (low == 0) {
                    break;
                }
                str += "" + String.fromCharCode(low);
                if (high == 0) {
                    break;
                }
                str += "" + String.fromCharCode(high);
                i++;
            }
            this.rawcanvas.append(str);
        } else {
            this.lastError = "This systemcall is not supported yet ("+syscallid+") ";
            this.stop();
            return;
        }

        this.setRegister("pc", this.registers.pc + 1);
    }

    doV2RA() {
        if(this.version>=2){
            this.setRegister("pc", this.registers.pc + 1);
            var item = this.getRegisterById(this.current_argument);
            this.grabNextInstruction();
            this.setRegister(item, this.current_argument);
            this.setRegister("pc", this.registers.pc + 1);
        }else{
            this.setRegister("a", this.current_argument);
            this.setRegister("pc", this.registers.pc + 1);
        }
    }

    doV2RB() {
        this.setRegister("b", this.current_argument);
        this.setRegister("pc", this.registers.pc + 1);
    }

    doReturn() {
        this.setRegister("pc", this.callstack.pop());
    }

    doCall() {
        this.callstack.push(this.registers.pc + 1);

        this.setRegister("pc", this.current_argument);
    }

    doA2RA() {
        if(this.version>=2){
            this.setRegister("pc", this.registers.pc + 1);
            var item = this.getRegisterById(this.current_argument);
            this.grabNextInstruction();
            this.setRegister(item, this.memory[this.current_argument]);
            this.setRegister("pc", this.registers.pc + 1);
        }else{
            this.setRegister("a", this.memory[this.current_argument]);
            this.setRegister("pc", this.registers.pc + 1);
        }
    }

    doA2RB() {
        this.setRegister("b", this.memory[this.current_argument]);
        this.setRegister("pc", this.registers.pc + 1);
    }

    doRA2A() {
        if(this.version>=2){
            this.setRegister("pc", this.registers.pc + 1);
            var item = this.getRegisterById(this.current_argument);
            this.grabNextInstruction();
            this.memory[item] = this.registers.a;
            this.setRegister("pc", this.registers.pc + 1);

        }else{
            this.memory[this.current_argument] = this.registers.a;
            this.setRegister("pc", this.registers.pc + 1);
        }
    }

    doRB2A() {
        this.memory[this.current_argument] = this.registers.b;

        this.setRegister("pc", this.registers.pc + 1);
    }

    doJump() {
        this.setRegister("pc", this.current_argument);
    }

    doMath() {
        if (this.current_argument == 1) {
            this.setRegister("a", this.registers.a + this.registers.b);
        } else if (this.current_argument == 2) {
            this.setRegister("a", this.registers.a - this.registers.b);
        } else if (this.current_argument == 3) {
            this.setRegister("a", this.registers.a / this.registers.b);
        } else if (this.current_argument == 4) {
            this.setRegister("a", this.registers.a * this.registers.b);
        } else if (this.current_argument == 16) {
            this.doDebug();
        } else if (this.current_argument == 17) {
            return this.doReturn();
        } else if (this.current_argument == 18) {
            this.stack.push(this.registers.a);
        } else if (this.current_argument == 19) {
            this.stack.push(this.registers.b);
        } else if (this.current_argument == 20) {
            this.registers.a = this.stack.pop();
        } else if (this.current_argument == 21) {
            this.registers.b = this.stack.pop();
        }

        this.setRegister("pc", this.registers.pc + 1);
    }

    doJE() {
        if (this.registers.a === this.registers.b) {
            this.setRegister("pc", this.current_argument);
        } else {
            this.setRegister("pc", this.registers.pc + 1);
        }
    }

    doJM() {
        if (this.registers.a > this.registers.b) {
            this.setRegister("pc", this.current_argument);
        } else {
            this.setRegister("pc", this.registers.pc + 1);
        }
    }

    doJL() {
        if (this.registers.a < this.registers.b) {
            this.setRegister("pc", this.current_argument);
        } else {
            this.setRegister("pc", this.registers.pc + 1);
        }
    }

    doJNE() {
        if (this.registers.a != this.registers.b) {
            this.setRegister("pc", this.current_argument);
        } else {
            this.setRegister("pc", this.registers.pc + 1);
        }
    }

    insertCartridge(dataset) {
        // check size of the cardridge
        if (dataset.length != 4103) {
            this.setStatus(
                "Invalid cardridge. Expected a size of 4103 but found " +
                    dataset.length
            );
            return;
        }
        // check signature
        // SIGNATURE
        if (!(dataset[0] == 0x5853 && dataset[1] == 0xcd45)) {
            this.setStatus("Invalid signature");
            return;
        }
        // MACHINE TYPE
        if (!(dataset[2] == 0x0101)) {
            this.setStatus("Invalid machine type");
            return;
        }
        // VERSION
        if (!(dataset[3] <= 0x0002)) {
            this.setStatus("Invalid version");
            return;
        }
        this.version = dataset[3];
        this.notifyListeners({
            event: "version",
            data: {
                state: this.version,
            },
        });
        // release to the emulator
        this.memory = dataset.subarray(4);
        this.registers = {
            a: 0,
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            f: 0,
            pc: 0,
        };
        this.callstack = [];
        this.stack = [];
        this.lastError = null;
        this.ticksSinceBoot = 0;
        this.rawcanvas.innerHTML =
            "Application is running since " + new Date().toISOString() + "\n";
        this.isRunning = true;
        this.notifyListeners({
            event: "regset",
            data: { register: "pc" },
        });
        this.timer = window.setInterval(this.tick.bind(this), 1);
    }

    getOpcodeFromInstruction(instruction) {
        return (instruction & 0xf000) >> 12;
    }

    getInstructionArguments(instruction) {
        return instruction & 0x0fff;
    }

    opcodeAddressToString(address) {
        const opcode = this.getOpcodeFromInstruction(this.memory[address]);
        if(opcode==5){
            return ["UNKNOWN","ADD","SUB","DIV","MUL","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","UNKNOWN","DEBUG","RETURN","PUSHRA","PUSHRB","POPRA","POPRB"][this.getInstructionArguments(this.memory[address])];
        }
        return opcodeToString(opcode);
    }
}
