

class MikeBasicCompilerToken {
    constructor(tokenstring, isstring) {
        this.value = tokenstring;
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

export class MikeBASICCompiler{

    constructor(textarea, errorContainerEl) {
        this.textarea = textarea;
        this.errorcontainer = errorContainerEl;
    }

    getEditorsContent() {
        return this.textarea.value.trim();
    }

    sourceToTokens() {
        var chararray = this.source.split("");
        var tokenbuffer = "";
        var isstring = false;
        this.tokens = [];
        for (var i = 0; i < chararray.length; i++) {
            var dezetoken = chararray[i];
            if (
                (dezetoken == " " || dezetoken == "\n" || dezetoken == ",") &&
                !isstring
            ) {
                if (tokenbuffer.length != 0) {
                    this.tokens.push(
                        new MikeBasicCompilerToken(
                            tokenbuffer,
                            isstring
                        )
                    );
                }
                tokenbuffer = "";
            } else if (dezetoken == '"') {
                if (tokenbuffer.length != 0) {
                    this.tokens.push(
                        new MikeBasicCompilerToken(
                            tokenbuffer,
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
                new MikeBasicCompilerToken(tokenbuffer, isstring)
            );
        }
    }

    setSource(source) {
        var tmpsource = [];
        var tmporiginal = source.split("\n");
        for (var i = 0; i < tmporiginal.length; i++) {
            var deze = tmporiginal[i].trim();
            if (deze.toLowerCase().startsWith("rem")) {
                tmpsource.push("");
            } else {
                tmpsource.push(deze);
            }
        }
        this.source = tmpsource.join("\n");
    }

    setMessage(message) {
        this.errorcontainer.innerHTML = message;
    }

    addSyscallDefo(functionnumber,functionvalue){
        var name = "variable_" + Math.round(Math.random());
        this.ast.push("SYSCALL "+name);
        this.ast.push("JUMP "+name+"_definer");
        this.ast.push(""+name+":");
        this.ast.push("DUMP "+functionnumber);
        if(functionvalue!=null){
            if(functionvalue.type=="STRING"){
                this.ast.push("DUMP \""+functionvalue.value+"\"");
            }else{
                this.ast.push("DUMP "+functionvalue.value);
            }
        }
        this.ast.push(""+name+"_definer:");
    }

    interpetateTokens(){
        this.ast = [];
        this.error = [];
        for(var i = 0 ; i < this.tokens.length ; i++){
            var mainSubject = this.tokens[i];
            console.log("@",mainSubject);
            var functionname = mainSubject.value.toLowerCase();
            if(functionname=="alert"){
                i++;
                var subSubject = this.tokens[i];
                this.addSyscallDefo(2,subSubject);
            }else if(functionname=="cls"){
                this.addSyscallDefo(3,null);
            }else if(functionname=="print"){
                i++;
                var subSubject = this.tokens[i];
                this.addSyscallDefo(1,subSubject);
            }else if(functionname=="goto"){
                i++;
                var subSubject = this.tokens[i];
                this.ast.push("JUMP "+subSubject.value);
            }else if(functionname=="input"){
                i++;
                var subSubject = this.tokens[i];
                this.addSyscallDefo(4,subSubject);
            }else if(functionname=="end"){
                this.ast.push("EXIT 0");
            }else if(functionname.endsWith(":")){
                this.ast.push(functionname);
            }else{
                this.error.push("Unknown opcode: "+functionname);
                break;
            }
        }
        this.setMessage(this.error.join("<br/>"));
        if(this.error.length>0){
            return;
        }

    }

    offer(sourcecode){
        var result = "";
        this.error = [];
        this.ast = [];
        this.setSource(sourcecode);
        this.sourceToTokens();
        this.interpetateTokens();
        if(this.error.length>0){
            return;
        }
        result = this.ast.join("\n");
        if(typeof(this.onCompiled)==="function"){
            this.onCompiled(result);
        }
    }

    attach(){
        this.textarea.addEventListener("keyup", () => {
            const sourceCode = this.getEditorsContent();
            this.offer(sourceCode);
        });
    }

    setOnCompiledListener(fun) {
        this.onCompiled = fun;
    }
}