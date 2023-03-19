
const SXE_OPCODE_EXIT = 0xF;
const SXE_OPWORD_EXIT = "EXIT";

// DEBUG nothing
const SXE_OPCODE_DEBUG = 0xE;
const SXE_OPWORD_DEBUG = "DEBUG";

// SYSCALL [ADDR] 
const SXE_OPCODE_SYSCALL = 0xD;
const SXE_OPWORD_SYSCALL = "SYSCALL";

// RETURN nothing
const SXE_OPCODE_RETURN = 0xC;

// CALL [ADDR]
const SXE_OPCODE_CALL = 0xB;

// ADDR to REGA [ADDR]
const SXE_OPCODE_A2RA = 0xA;

// ADDR to REGB [ADDR]
const SXE_OPCODE_A2RB = 0x9;

// REGA to ADDR [ADDR]
const SXE_OPCODE_RA2A = 0x8;

// REGB to ADDR [ADDR]
const SXE_OPCODE_RB2A = 0x7;

// JUMP [ADDR]
const SXE_OPCODE_JUMP = 0x6;

// MATH [FLAGS]
const SXE_OPCODE_FLAGS = 0x5;

// JE [ADDR]
const SXE_OPCODE_JE = 0x4;

// JM [ADDR]
const SXE_OPCODE_JM = 0x3;

// JL [ADDR]
const SXE_OPCODE_JL = 0x2;

// JNE [ADDR]
const SXE_OPCODE_JNE = 0x1;

// NOOPCODE
const SXE_OPCODE_NOP = 0x0;

class FruitflyCompilerToken {

    constructor(tokenstring, rijnummer, isstring) {
        this.value = tokenstring;
        this.rownumber = rijnummer;
        this.type = isstring ? "STRING" : "UNKNOWN";
    }

    checkType() {
        if (this.type == "STRING") {
            return;
        }
        if (this.type == "NUMBER") {
            return;
        }
        if (isNaN(this.value)) {
            if (this.value.endsWith(":")) {
                this.type = "LABEL";
                this.value = this.value.replace(":", "");
            } else if ([SXE_OPWORD_EXIT, SXE_OPWORD_DEBUG, "SYSCALL"].includes(this.value.toUpperCase())) {
                this.value = this.value.toUpperCase();
                this.type = "KEYWORD";
            } else {
                this.type = "SYMBOL";
            }
        } else {
            this.type = "NUMBER";
            this.value = Number(this.value);
        }
    }

    getType() {
        return this.type;
    }
}

class FruitflyCompiler {

    constructor() { }



    setSource(source) {
        var tmpsource = [];
        var tmporiginal = source.split("\n");
        for (var i = 0; i < tmporiginal.length; i++) {
            var deze = tmporiginal[i].trim();
            if (deze.startsWith("//")) {
                tmpsource.push("");
            } else {
                tmpsource.push(deze);
            }
        }
        this.source = tmpsource.join("\n");
    }

    sourceToTokens() {
        var chararray = this.source.split("");
        var tokenbuffer = "";
        var rijnummer = 1;
        var isstring = false;
        for (var i = 0; i < chararray.length; i++) {
            var dezetoken = chararray[i];
            if (dezetoken == '\n') {
                rijnummer++;
            }
            if ((dezetoken == ' ' || dezetoken == '\n' || dezetoken == ',') && !isstring) {
                if (tokenbuffer.length != 0) {
                    this.tokens.push(new FruitflyCompilerToken(tokenbuffer, rijnummer, isstring));
                }
                tokenbuffer = "";
            } else if (dezetoken == '\"') {
                if (tokenbuffer.length != 0) {
                    this.tokens.push(new FruitflyCompilerToken(tokenbuffer, rijnummer, isstring));
                }
                tokenbuffer = "";
                isstring = !isstring;
            } else {
                tokenbuffer += dezetoken;
            }
        }
        if (tokenbuffer.length != 0) {
            this.tokens.push(new FruitflyCompilerToken(tokenbuffer, rijnummer, isstring));
        }
        this.max_row_number = rijnummer;
    }

    interpetateTokens() {
        this.labellist = [];
        for (var i = 0; i < this.tokens.length; i++) {
            var current_token = this.tokens[i];
            current_token.checkType();
            if (current_token.getType() == "LABEL") {
                this.labellist.push(current_token.value);
            }
        }
        for (var i = 0; i < this.tokens.length; i++) {
            var current_token = this.tokens[i];
            if (current_token.getType() == "SYMBOL" && !this.labellist.includes(current_token.value)) {
                this.errorslist.push("Unknown symbol: " + current_token.value);
            }
        }
    }

    format(opcode, arg) {
        return (opcode * 0x1000) | arg;
    }

    generateAST() {
        for (var i = 0; i < this.tokens.length; i++) {
            var current_token = this.tokens[i];
            if (current_token.getType() == "LABEL") {
                this.ast.push({ bytecode: this.format(SXE_OPCODE_NOP, 0), label: current_token.value });
            } else if (current_token.getType() == "KEYWORD") {
                if (current_token.value == SXE_OPWORD_EXIT) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof (temp_token) === "undefined") {
                        this.errorslist.push("Expected: EXIT [EXITCODE], found: EXIT EOF");
                        return;
                    }
                    if (!(temp_token.getType() == "NUMBER")) {
                        this.errorslist.push("Expected: EXIT [NUMBER], found: EXIT " + temp_token.getType());
                        return;
                    }
                    console.log(temp_token);
                    this.ast.push({ bytecode: this.format(SXE_OPCODE_EXIT, temp_token.value), label: null });
                }
                else if (current_token.value == SXE_OPWORD_DEBUG) {
                    this.ast.push({ bytecode: this.format(SXE_OPCODE_DEBUG, 0), label: null });
                }
                else if (current_token.value == SXE_OPWORD_SYSCALL) { }
            }
        }
    }

    link() { }

    generateUint16DataArray(){
        var buffer = new Uint16Array(0xFFF + 8);
        // SIGNATURE
        buffer[0] = 0x5853;
        buffer[1] = 0xCD45;
        // VERSIONS
        buffer[2] = 0x0101;
        buffer[3] = 0x0001;
        // PROGRAMCODE
        for (var i = 0; i < this.ast.length; i++) {
            buffer[4 + i] = this.ast[i].bytecode;
        }
        return buffer;
    }


    output() {
        var buffer = this.generateUint16DataArray();
        var blobby = new Blob([buffer], { type: "octet/stream" });
        return window.URL.createObjectURL(blobby);
    }

    compile() {
        this.errorslist = [];
        this.tokens = [];
        this.ast = [];
        this.sourceToTokens();
        this.interpetateTokens();
        if (this.errorslist.length > 0) {
            return false;
        }
        this.generateAST();
        if (this.errorslist.length > 0) {
            return false;
        }
        this.link();
        if (this.errorslist.length > 0) {
            return false;
        }
        return this.output();
    }

    getErrors() {
        return this.errorslist;
    }

}

class FruitflyCompilerEditor extends FruitflyCompiler {

    constructor(textarea, messagearea, downloadlink) {
        super();
        this.textarea = textarea;
        this.messagearea = messagearea;
        this.downloadlink = downloadlink;
    }

    getEditorsContent() {
        return this.textarea.value.trim();
    }

    setMessage(message) {
        this.messagearea.innerHTML = message;
    }

    attach() {
        var innerthis = this;
        this.textarea.addEventListener("keyup", function (evt) {
            var sourcecode = innerthis.getEditorsContent();
            innerthis.setSource(sourcecode);
            var res = innerthis.compile();
            innerthis.setMessage(innerthis.getErrors().join("<br/>"));
            if (res !== false) {
                innerthis.downloadlink.href = res;
                innerthis.downloadlink.download = "test.sxe";
                innerthis.downloadlink.classList.remove("disabled");
            }else{
                innerthis.downloadlink.classList.add("disabled");
            }
        });
    }
}
