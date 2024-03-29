import { opcodes } from "./opcodes.js";

// EXIT exitcode OK
const SXE_OPWORD_EXIT = "EXIT";

// DEBUG nothing OK
const SXE_OPWORD_DEBUG = "DEBUG";

// SYSCALL [ADDR] PENDING
const SXE_OPWORD_SYSCALL = "SYSCALL";

// RETURN nothing OK
const SXE_OPWORD_RETURN = "RETURN";

// CALL [ADDR] OK
const SXE_OPWORD_CALL = "CALL";

// ADDR to REGA [ADDR] OK
const SXE_OPWORD_A2RA = "A2RA";

// ADDR to REGB [ADDR] OK
const SXE_OPWORD_A2RB = "A2RB";

// REGA to ADDR [ADDR] OK
const SXE_OPWORD_RA2A = "RA2A";

// REGB to ADDR [ADDR] OK
const SXE_OPWORD_RB2A = "RB2A";

// JUMP [ADDR] OK
const SXE_OPWORD_JUMP = "JUMP";

// MATH [FLAGS] OK
const SXE_OPWORD_FLAGS = "FLAGS";

// JE [ADDR] OK
const SXE_OPWORD_JE = "JE";

// JM [ADDR] OK
const SXE_OPWORD_JM = "JM";

// JL [ADDR] OK
const SXE_OPWORD_JL = "JL";

// JNE [ADDR] OK
const SXE_OPWORD_JNE = "JNE";

// NOOPCODE
const SXE_OPWORD_NOP = "NOP";

const SXE_OPWORD_ADD = "ADD";
const SXE_OPWORD_SUB = "SUB";
const SXE_OPWORD_DIV = "DIV";
const SXE_OPWORD_MUL = "MUL";
const SXE_OPWORD_DUMP = "DUMP";

const SXE_OPWORD_V2RA = "V2RA";
const SXE_OPWORD_V2RB = "V2RB";

const SXE_OPWORD_PUSHRA = "PUSHRA";
const SXE_OPWORD_PUSHRB = "PUSHRB";
const SXE_OPWORD_POPRA = "POPRA";
const SXE_OPWORD_POPRB = "POPRB";

const VALID_OPCODES = [
    SXE_OPWORD_EXIT,
    SXE_OPWORD_DEBUG,
    SXE_OPWORD_SYSCALL,
    SXE_OPWORD_RETURN,
    SXE_OPWORD_CALL,
    SXE_OPWORD_A2RA,
    SXE_OPWORD_A2RB,
    SXE_OPWORD_RA2A,
    SXE_OPWORD_RB2A,
    SXE_OPWORD_JUMP,
    SXE_OPWORD_JE,
    SXE_OPWORD_JM,
    SXE_OPWORD_JL,
    SXE_OPWORD_JNE,
    SXE_OPWORD_ADD,
    SXE_OPWORD_SUB,
    SXE_OPWORD_DIV,
    SXE_OPWORD_MUL,
    SXE_OPWORD_DUMP,
    SXE_OPWORD_V2RA,
    SXE_OPWORD_V2RB,
    SXE_OPWORD_PUSHRA,
    SXE_OPWORD_PUSHRB,
    SXE_OPWORD_POPRA,
    SXE_OPWORD_POPRB,
];

class FruitflyCompilerToken {
    constructor(tokenstring, rijnummer, isstring) {
        this.value = tokenstring;
        this.rownumber = rijnummer;
        this.type = isstring ? "STRING" : "UNKNOWN";
    }

    checkType() {
        if (this.type == "STRING") {
            this.value = this.value.replace("\\n", "\n").replace("\\t", "\t");
            return;
        }
        if (this.type == "NUMBER") {
            return;
        }
        if (isNaN(this.value)) {
            if (this.value.endsWith(":")) {
                this.type = "LABEL";
                this.value = this.value.replace(":", "");
            } else if (VALID_OPCODES.includes(this.value.toUpperCase())) {
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

export class FruitflyCompiler {
    constructor() {}

    setVersion(ver){
        this.version = ver;
    }

    getVersion(){
        return this.version;
    }

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
            if (dezetoken == "\n") {
                rijnummer++;
            }
            if (
                (dezetoken == " " || dezetoken == "\n" || dezetoken == ",") &&
                !isstring
            ) {
                if (tokenbuffer.length != 0) {
                    this.tokens.push(
                        new FruitflyCompilerToken(
                            tokenbuffer,
                            rijnummer,
                            isstring
                        )
                    );
                }
                tokenbuffer = "";
            } else if (dezetoken == '"') {
                if (tokenbuffer.length != 0) {
                    this.tokens.push(
                        new FruitflyCompilerToken(
                            tokenbuffer,
                            rijnummer,
                            isstring
                        )
                    );
                }
                tokenbuffer = "";
                isstring = !isstring;
            } else {
                tokenbuffer += dezetoken;
            }
        }
        if (tokenbuffer.length != 0) {
            this.tokens.push(
                new FruitflyCompilerToken(tokenbuffer, rijnummer, isstring)
            );
        }
        this.max_row_number = rijnummer;
    }

    interpetateTokens() {
        this.labellist = [];
        this.calltable = [];
        for (var i = 0; i < this.tokens.length; i++) {
            var current_token = this.tokens[i];
            current_token.checkType();
            if (current_token.getType() == "LABEL") {
                this.labellist.push(current_token.value);
                this.calltable[current_token.value] = 0x0fff;
            }
        }
        for (var i = 0; i < this.tokens.length; i++) {
            var current_token = this.tokens[i];
            if (
                current_token.getType() == "SYMBOL" &&
                !this.labellist.includes(current_token.value)
            ) {
                this.errorslist.push("Unknown symbol: " + current_token.value);
            }
        }
    }

    getOpcodeFromBytecode(arg) {
        return (arg & 0xf000) >> 12;
    }

    format(opcode, oparg) {
        const value = (Number(opcode) * 0x1000) | Number(oparg);
        return value;
    }

    getWatchInformation(){
        return this.calltable;
    }

    generateAST() {
        for (var i = 0; i < this.tokens.length; i++) {
            var current_token = this.tokens[i];
            if (current_token.getType() == "LABEL") {
                this.calltable[current_token.value] = this.ast.length;
            } else if (current_token.getType() == "KEYWORD") {
                if (current_token.value == SXE_OPWORD_EXIT) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: EXIT [EXITCODE], found: EXIT EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "NUMBER")) {
                        this.errorslist.push(
                            "Expected: EXIT [NUMBER], found: EXIT " +
                                temp_token.getType()
                        );
                        return;
                    }
                    this.ast.push({
                        bytecode: this.format(opcodes.EXIT, temp_token.value),
                        label: null,
                    });
                } else if (current_token.value == SXE_OPWORD_DEBUG) {
                    this.ast.push({
                        bytecode: this.format(opcodes.FLAGS, 16),
                        label: null,
                    });
                } else if (current_token.value == SXE_OPWORD_SYSCALL) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: SYSCALL [ADDR], found: SYSCALL EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: SYSCALL [SYMBOL], found: SYSCALL " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    this.ast.push({
                        bytecode: this.format(opcodes.SYSCALL, vc),
                        label: tv,
                    });
                } else if (current_token.value == SXE_OPWORD_RETURN) {
                    this.ast.push({
                        bytecode: this.format(opcodes.FLAGS, 17),
                        label: null,
                    });
                } else if (current_token.value == SXE_OPWORD_CALL) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: CALL [ADDR], found: CALL EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: CALL [SYMBOL], found: CALL " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    this.ast.push({
                        bytecode: this.format(opcodes.CALL, vc),
                        label: tv,
                    });
                } else if (current_token.value == SXE_OPWORD_A2RA) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: A2RA [SYMBOL], found: A2RA EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: A2RA [SYMBOL], found: A2RA " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.A2RA, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.A2RX, 0),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_A2RB) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: A2RB [SYMBOL], found: A2RB EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: A2RB [SYMBOL], found: A2RB " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.A2RB, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.A2RX, 1),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_RA2A) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: RA2A [SYMBOL], found: RA2A EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: RA2A [SYMBOL], found: RA2A " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.RA2A, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.RA2X, 0),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_RB2A) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: RB2A [SYMBOL], found: RB2A EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: RB2A [SYMBOL], found: RB2A " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.RB2A, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.RA2X, 1),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_JUMP) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: JUMP [ADDR], found: JUMP EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: JUMP [SYMBOL], found: JUMP " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    this.ast.push({
                        bytecode: this.format(opcodes.JUMP, vc),
                        label: tv,
                    });
                } else if (current_token.value == SXE_OPWORD_ADD) {
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 1),
                            label: null,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 1),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: 0x01,
                            label: null,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_SUB) {
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 2),
                            label: null,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 2),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: 0x01,
                            label: null,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_DIV) {
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 3),
                            label: null,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 3),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: 0x01,
                            label: null,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_MUL) {
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 4),
                            label: null,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.FLAGS, 4),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: 0x01,
                            label: null,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_JE) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: JE [ADDR], found: JE EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: JE [SYMBOL], found: JE " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    this.ast.push({
                        bytecode: this.format(opcodes.JE, vc),
                        label: tv,
                    });
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.JE, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.JEX, 0x01),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_JM) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: JM [ADDR], found: JM EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: JM [SYMBOL], found: JM " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    this.ast.push({
                        bytecode: this.format(opcodes.JM, vc),
                        label: tv,
                    });
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.JM, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.JMX, 0x01),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_JL) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: JL [ADDR], found: JL EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: JL [SYMBOL], found: JL " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    this.ast.push({
                        bytecode: this.format(opcodes.JL, vc),
                        label: tv,
                    });
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.JL, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.JLX, 0x01),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_JNE) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: JNE [ADDR], found: JNE EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "SYMBOL")) {
                        this.errorslist.push(
                            "Expected: JNE [SYMBOL], found: JNE " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = this.calltable[temp_token.value];
                    var tv = null;
                    if (vc == 0xfff) {
                        tv = temp_token.value;
                    }
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.JNE, vc),
                            label: tv,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.JNX, 0x01),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_DUMP) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: DUMP [SOMETHING], found: DUMP EOF"
                        );
                        return;
                    }
                    if (temp_token.getType() == "SYMBOL") {
                        var vc = this.calltable[temp_token.value];
                        var tv = null;
                        if (vc == 0xfff) {
                            tv = temp_token.value;
                        }
                        this.ast.push({
                            bytecode: this.format(opcodes.NOP, vc),
                            label: tv,
                        });
                    } else if (temp_token.getType() == "NUMBER") {
                        this.ast.push({
                            bytecode: temp_token.value,
                            label: null,
                        });
                    } else if (temp_token.getType() == "STRING") {
                        if (temp_token.value.length == 0) {
                            continue;
                        }
                        temp_token.value += "\0";
                        if (temp_token.value.length % 2 != 0) {
                            temp_token.value += "\0";
                        }
                        for (var z = 0; z < temp_token.value.length; z += 2) {
                            this.ast.push({
                                bytecode:
                                    temp_token.value.charCodeAt(z) +
                                    temp_token.value.charCodeAt(z + 1) * 0x100,
                                label: null,
                            });
                        }
                    } else {
                        this.errorslist.push(
                            "Unknown DUMP type: " + temp_token.getType()
                        );
                        return;
                    }
                } else if (current_token.value == SXE_OPWORD_V2RA) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: V2RA [NUMBER], found: V2RA EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "NUMBER")) {
                        this.errorslist.push(
                            "Expected: V2RA [NUMBER], found: V2RA " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = temp_token.value;
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.V2RA, vc),
                            label: null,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.V2RX, 0),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (current_token.value == SXE_OPWORD_V2RB) {
                    i++;
                    var temp_token = this.tokens[i];
                    if (typeof temp_token === "undefined") {
                        this.errorslist.push(
                            "Expected: V2RB [NUMBER], found: V2RB EOF"
                        );
                        return;
                    }
                    if (!(temp_token.getType() == "NUMBER")) {
                        this.errorslist.push(
                            "Expected: V2RB [SYMBOL], found: V2RB " +
                                temp_token.getType()
                        );
                        return;
                    }
                    var vc = temp_token.value;
                    if(this.getVersion()==1){
                        this.ast.push({
                            bytecode: this.format(opcodes.V2RB, vc),
                            label: null,
                        });
                    }else if(this.getVersion()>=2){
                        this.ast.push({
                            bytecode: this.format(opcodes.V2RX, 1),
                            label: null,
                        });
                        this.ast.push({
                            bytecode: vc,
                            label: tv,
                        });
                    }
                } else if (this.getVersion()==1 && current_token.value == SXE_OPWORD_PUSHRA) {
                    this.ast.push({
                        bytecode: this.format(opcodes.FLAGS, 18),
                        label: null,
                    });
                } else if (this.getVersion()==1 && current_token.value == SXE_OPWORD_PUSHRB) {
                    this.ast.push({
                        bytecode: this.format(opcodes.FLAGS, 19),
                        label: null,
                    });
                } else if (this.getVersion()==1 && current_token.value == SXE_OPWORD_POPRA) {
                    this.ast.push({
                        bytecode: this.format(opcodes.FLAGS, 20),
                        label: null,
                    });
                } else if (this.getVersion()==1 && current_token.value == SXE_OPWORD_POPRB) {
                    this.ast.push({
                        bytecode: this.format(opcodes.FLAGS, 21),
                        label: null,
                    });
                } else {
                    this.errorslist.push(
                        "Unknown token: " + current_token.value
                    );
                    return;
                }
            }
        }
    }

    link() {
        for (var i = 0; i < this.ast.length; i++) {
            var thisone = this.ast[i];
            if (thisone.label != null) {
                thisone.bytecode = this.format(
                    this.getOpcodeFromBytecode(thisone.bytecode),
                    this.calltable[thisone.label]
                );
                if ((thisone.bytecode & 0xfff) == 0xfff) {
                    this.errorslist.push("unresolved symbol: " + thisone.label);
                }
            }
        }
    }

    generateUint16DataArray() {
        var buffer = new Uint16Array(0xfff + 8);
        // SIGNATURE
        buffer[0] = 0x5853;
        buffer[1] = 0xcd45;
        // VERSIONS
        buffer[2] = 0x0101;
        buffer[3] = this.getVersion();
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

    getOpcodes(){
        return VALID_OPCODES;
    }
}
