import { basicSetup, EditorView } from "./cm/codemirror.js";
import { autocompletion } from "./cm/@codemirror-autocomplete.js";
import { ViewPlugin, keymap } from "./cm/@codemirror-view.js";
import { indentWithTab } from "./cm/@codemirror-commands.js";
import { FruitflyAbstractCompilerEditor, DEFAULT_PROGRAM } from "./editor.js";

export class FruitflyCodeMirrorCompilerEditor extends FruitflyAbstractCompilerEditor{

    constructor(texthost,errorContainerEl, downloadLink) {
        super(errorContainerEl, downloadLink);
        var innerthis = this;
        this.textmirror = new EditorView({
            doc: DEFAULT_PROGRAM,
            extensions: [
              basicSetup,
              keymap.of([indentWithTab]),
              ViewPlugin.fromClass(class {
                  constructor(view) {}
          
                  update(update) {
                    if (update.docChanged)
                        innerthis.fire();
                  }
                }),
              autocompletion({override: [this.myCompletions.bind(this)]})
            ],
            parent: texthost
        });
    }

    setEditorsContent(cont){
        var u = this.textmirror.state.update({changes: {from: 0, to: this.textmirror.state.doc.length, insert: cont}});
        this.textmirror.update([u]);
    }
    
    myCompletions(context) {
        let before = context.matchBefore(/\w+/);
        var opcodelist = this.getCompiler().getOpcodes();
        var completions = [
            {label: "park", type: "constant", info: "Test completion"},
        ];
        for(var i = 0 ; i < opcodelist.length ; i++){
            completions.push({label: opcodelist[i], type: "keyword"});
        }
        var variablelist = Object.keys(this.getCompiler().getWatchInformation());
        for(var i = 0 ; i < variablelist.length ; i++){
            completions.push({label: variablelist[i], type: "variable"});
        }
        // If completion wasn't explicitly started and there
        // is no word before the cursor, don't open completions.
        if (!context.explicit && !before) {
            return null;
        }
        return {
            from: before ? before.from : context.pos,
            options: completions,
            validFor: /^\w*$/
        };
    }

    getEditorsContent() {
        return this.textmirror.state.doc.toString();
    }

    fire() {
        this.fireEvent();
    }

    attach() {
        EditorView.updateListener.of(this.fireEvent.bind(this));
    }
}