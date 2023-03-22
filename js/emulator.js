export class FruitflyEmulator {
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
        this.lasterror = null;
        this.onexit = null;
        this.tickssinceboot = 0;
        var innerthis = this;
        this.timer = window.setInterval(function () {
            innerthis.tick();
        }, 1);
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

    tick() {
        this.tickssinceboot++;
        this.setStatus(
            "IP = 0x" +
                this.instruction_pointer.toString(16) +
                " | A = 0x" +
                this.registerA.toString(16) +
                " | B = 0x" +
                this.registerB.toString(16) +
                " | Opcode = 0x" +
                this.current_opcode.toString(16) +
                " | Argument = 0x" +
                this.current_argument.toString(16) +
                " | Stack = " +
                this.callstack.join(",") +
                " | LastError=" +
                this.lasterror +
                " | IsRunning=" +
                this.is_running +
                " | Ticks=" +
                this.tickssinceboot
        );
        if (!this.is_running) {
            return;
        }
        if (this.memory[0] == 0) {
            return;
        }
        this.current_opcode_set = this.memory[this.instruction_pointer];
        this.current_opcode = (this.current_opcode_set & 0xf000) >> 12;
        this.current_argument = this.current_opcode_set & 0x0fff;
        if (this.current_opcode == 0xf) {
            // EXIT
            this.is_running = false;
            if (this.onexit != null) {
                this.onexit(this.current_argument);
            }
        } else if (this.current_opcode == 0xe) {
            // DEBUG
            window.alert(this.getStatus());
            this.instruction_pointer++;
        } else if (this.current_opcode == 0xd) {
            // SYSTEMCALL
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
                this.is_running = false;
                this.lasterror = "This systemcall is not supported yet";
                return;
            }
            this.instruction_pointer++;
        } else if (this.current_opcode == 0xc) {
            // RETURN
            this.instruction_pointer = this.callstack.pop();
        } else if (this.current_opcode == 0xb) {
            // CALL
            this.callstack.push(this.instruction_pointer + 1);
            this.instruction_pointer = this.current_argument;
        } else if (this.current_opcode == 0xa) {
            // A2RA
            this.A = this.memory[this.current_argument];
            this.instruction_pointer++;
        } else if (this.current_opcode == 0x9) {
            // A2RB
            this.B = this.memory[this.current_argument];
            this.instruction_pointer++;
        } else if (this.current_opcode == 0x8) {
            // RA2A
            this.memory[this.current_argument] = this.A;
            this.instruction_pointer++;
        } else if (this.current_opcode == 0x7) {
            // RB2A
            this.memory[this.current_argument] = this.B;
            this.instruction_pointer++;
        } else if (this.current_opcode == 0x6) {
            // JUMP
            this.instruction_pointer = this.current_argument;
            this.instruction_pointer++;
        } else if (this.current_opcode == 0x5) {
            // MATH
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
            this.instruction_pointer++;
        } else if (this.current_opcode == 0x4) {
            // JE
            if (this.A == this.B) {
                this.instruction_pointer = this.current_argument;
            } else {
                this.instruction_pointer++;
            }
        } else if (this.current_opcode == 0x3) {
            // JM
            if (this.A > this.B) {
                this.instruction_pointer = this.current_argument;
            } else {
                this.instruction_pointer++;
            }
        } else if (this.current_opcode == 0x2) {
            // JL
            if (this.A < this.B) {
                this.instruction_pointer = this.current_argument;
            } else {
                this.instruction_pointer++;
            }
        } else if (this.current_opcode == 0x1) {
            // JNE
            if (this.A != this.B) {
                this.instruction_pointer = this.current_argument;
            } else {
                this.instruction_pointer++;
            }
        } else {
            this.is_running = false;
            this.lasterror = "Unknown opcode";
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
        this.lasterror = null;
        this.tickssinceboot = 0;
        this.rawcanvas.innerHTML =
            "Application is running since " + new Date().toISOString() + "\n";
        this.is_running = true;
    }
}
