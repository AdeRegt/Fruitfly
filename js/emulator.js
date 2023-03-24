import { opcodes } from "./opcodes.js";

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
        [opcodes.SXE_OPWORD_V2RA]: this.doV2RA,
        [opcodes.SYSCALL]: this.doSystemCall,
        [opcodes.SXE_OPWORD_V2RB]: this.doV2RB,
        [opcodes.EXIT]: this.doExit,
    };

    constructor(canvas, status) {
        this.rawcanvas = canvas;
        this.rawstatus = status;
        this.memory = new Uint16Array(4103);
        this.instruction_pointer = 0;
        this.registerA = 0;
        this.registerB = 0;
        this.callstack = [];
        this.current_opcode = 0;
        this.current_argument = 0;
        this.is_running = false;
        this.lastError = null;
        this.onexit = null;
        this.ticksSinceBoot = 0;
        this.timer = null;
    }

    setStatus(message) {
        this.rawstatus.innerHTML = message;
    }

    getStatus() {
        return this.rawstatus.innerHTML;
    }

    setOnExitListener(fun) {
        this.onexit = fun;
    }

    setRegisterInfo(ip, a, b, op, ar, call, le, ir, tick) {
        this.lab_ip = ip;
        this.lab_a = a;
        this.lab_b = b;
        this.lab_op = op;
        this.lab_ar = ar;
        this.lab_call = call;
        this.lab_le = le;
        this.lab_ir = ir;
        this.lab_tick = tick;
    }

    formatString(ind) {
        if(typeof(ind)==="undefined"){
            return "Error";
        }
        if(Number.isNaN(ind)){
            return "Error";
        }
        var t = ind;
        while (t.length < 4) {
            t = "0" + t;
        }
        return t;
    }

    /**
     * TODO: possibly it would be great to move all the visual logic out of the module.
     * The idea is by doing that the emulator can be easily ported, for example to run on Node or Deno.
     */
    updateStatus() {
        this.lab_ip.innerHTML =
            "0x" + this.formatString(this.instruction_pointer.toString(16));
        this.lab_a.innerHTML =
            "0x" + this.formatString(this.registerA.toString(16));
        this.lab_b.innerHTML =
            "0x" + this.formatString(this.registerB.toString(16));
        this.lab_op.innerHTML =
            "0x" + this.formatString(this.current_opcode.toString(16));
        this.lab_ar.innerHTML =
            "0x" + this.formatString(this.current_argument.toString(16));
        this.lab_call.innerHTML = this.callstack.join(",");
        this.lab_le.value = this.lastError;
        if (this.is_running) {
            this.lab_ir.setAttribute("checked", this.is_running);
        } else {
            this.lab_ir.removeAttribute("checked");
        }
        this.lab_tick.innerHTML = this.ticksSinceBoot;
    }

    stop() {
        this.is_running = false;
        window.clearInterval(this.timer);
    }

    tick() {
        this.ticksSinceBoot++;
        this.updateStatus();

        if (!this.is_running) {
            return;
        }

        if (this.memory[0] === 0) {
            return;
        }

        this.current_opcode_set = this.memory[this.instruction_pointer];
        this.current_opcode = (this.current_opcode_set & 0xf000) >> 12;
        this.current_argument = this.current_opcode_set & 0x0fff;

        if (!this.operations[this.current_opcode]) {
            this.lastError = `Unknown opcode: ${this.current_opcode}`;
            this.stop();
        }

        this.operations[this.current_opcode].call(this);
    }

    doExit() {
        this.stop();
        this.updateStatus();

        if (this.onexit != null) {
            this.onexit(this.current_argument);
        }
    }

    doNop() {
        this.instruction_pointer++;
    }

    doDebug() {
        window.alert(this.getStatus());
        this.instruction_pointer++;
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
            this.lastError = "This systemcall is not supported yet";
            this.stop();
            return;
        }
        this.instruction_pointer++;
    }

    doV2RA(){
        this.A = this.current_argument;
        this.instruction_pointer++;
    }

    doV2RB(){
        this.B = this.current_argument;
        this.instruction_pointer++;
    }

    doReturn() {
        this.instruction_pointer = this.callstack.pop();
    }

    doCall() {
        this.callstack.push(this.instruction_pointer + 1);
        this.instruction_pointer = this.current_argument;
    }

    doA2RA() {
        this.A = this.memory[this.current_argument];
        this.instruction_pointer++;
    }

    doA2RB() {
        this.B = this.memory[this.current_argument];
        this.instruction_pointer++;
    }

    doRA2A() {
        this.memory[this.current_argument] = this.A;
        this.instruction_pointer++;
    }

    doRB2A() {
        this.memory[this.current_argument] = this.B;
        this.instruction_pointer++;
    }

    doJump() {
        this.instruction_pointer = this.current_argument;
    }

    doMath() {
        if (this.current_argument == 1) {
            this.A += this.B;
        }
        if (this.current_argument == 2) {
            this.A -= this.B;
        }
        if (this.current_argument == 3) {
            this.A /= this.B;
        }
        if (this.current_argument == 4) {
            this.A *= this.B;
        }
        if (this.current_argument == 16) {
            this.doDebug();
        }
        if (this.current_argument == 17){
            this.doReturn();
        }
        this.instruction_pointer++;
    }

    doJE() {
        if (this.A == this.B) {
            this.instruction_pointer = this.current_argument;
        } else {
            this.instruction_pointer++;
        }
    }

    doJM() {
        if (this.A > this.B) {
            this.instruction_pointer = this.current_argument;
        } else {
            this.instruction_pointer++;
        }
    }

    doJL() {
        if (this.A < this.B) {
            this.instruction_pointer = this.current_argument;
        } else {
            this.instruction_pointer++;
        }
    }

    doJNE() {
        if (this.A != this.B) {
            this.instruction_pointer = this.current_argument;
        } else {
            this.instruction_pointer++;
        }
    }

    insertCartridge(dataset) {
        // check size of the cardridge
        if (dataset.length != 4103) {
            window.alert(
                "Invalid cardridge. Expected size 4103 but found " +
                    dataset.length
            );
            return;
        }
        // check signature
        // SIGNATURE
        if (!(dataset[0] == 0x5853 && dataset[1] == 0xcd45)) {
            window.alert("Invalid signature");
            return;
        }
        // VERSIONS
        if (!(dataset[2] == 0x0101 && dataset[3] == 0x0001)) {
            window.alert("Invalid version");
            return;
        }
        // release to the emulator
        this.memory = dataset.subarray(4);
        this.instruction_pointer = 0;
        this.registerA = 0;
        this.registerB = 0;
        this.callstack = [];
        this.lastError = null;
        this.ticksSinceBoot = 0;
        this.rawcanvas.innerHTML =
            "Application is running since " + new Date().toISOString() + "\n";
        this.is_running = true;
        this.timer = window.setInterval(this.tick.bind(this), 1);
    }
}
