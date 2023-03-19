class FruitflyEmulator{

    constructor(canvas){
        this.rawcanvas = canvas;
        this.memory = new Uint16Array(4103);
        this.instruction_pointer = 0;
        this.registerA = 0;
        this.registerB = 0;
        this.callstack = [];
        this.is_running = false;
        var innerthis = this;
        this.timer = window.setInterval(function(){
            innerthis.tick();
        },1);
    }

    tick(){
        if(!this.is_running){
            return;
        }
        if(this.memory[0]==0){
            return;
        }
        this.current_opcode_set = this.memory[this.instruction_pointer];
        this.current_opcode = (this.current_opcode_set & 0xF000) >> 12;
        this.current_argument = (this.current_opcode_set & 0x0FFF);
    }

    insertCardridge(dataset){
        // check size of the cardridge
        if(dataset.length!=4103){
            window.alert("Invalid cardridge. Expected size 4103 but found "+dataset.length);
            return;
        }
        // check signature
        // SIGNATURE
        if(!(dataset[0] == 0x5853 && dataset[1] == 0xCD45)){
            window.alert("Invalid signature");
            return;
        }
        // VERSIONS
        if(!(dataset[2] == 0x0101 && dataset[3] == 0x0001)){
            window.alert("Invalid version");
            return;
        }
        // release to the emulator
        this.memory = dataset.subarray(4);
        this.instruction_pointer = 0;
        this.registerA = 0;
        this.registerB = 0;
        this.callstack = [];
        this.is_running = true;
    }
}