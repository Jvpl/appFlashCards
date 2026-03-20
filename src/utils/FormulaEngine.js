/**
 * FormulaEngine.js
 *
 * Motor lógico para o editor de fórmulas baseado em blocos (AST).
 * Gerencia a estrutura da fórmula, navegação do cursor e geração de LaTeX.
 *
 * Estrutura da AST (Simplificada):
 * Cada nó é um objeto:
 * {
 *   id: string (único),
 *   type: 'root' | 'text' | 'frac' | 'sqrt' | 'sup' | 'sub' | ...,
 *   value: string (apenas para 'text'),
 *   children: [Node, Node, ...] (para estruturas),
 *   parent: Node (referência ao pai),
 * }
 *
 * O Cursor é representado por:
 * {
 *   node: Node (nó onde o cursor está - geralmente um nó 'text' ou container),
 *   offset: number (posição dentro do valor do nó de texto, ou índice dos filhos)
 * }
 */

export class FormulaEngine {
    constructor() {
        this.root = this.createNode('root');
        // Inicializa com um nó de texto vazio na raiz para começar a digitar
        const initialText = this.createNode('text', '');
        initialText.parent = this.root;
        this.root.children.push(initialText);

        this.cursor = {
            node: initialText,
            offset: 0,
        };

        // Histórico para Undo/Redo (Futuro)
        this.history = [];
    }

    // --- Criação de Nós ---

    createNode(type, value = '') {
        return {
            id: Math.random().toString(36).substr(2, 9),
            type,
            value,
            children: [], // Array de nós filhos
            parent: null,
        };
    }

    // --- Manipulação ---

    /**
     * Insere um caractere na posição atual do cursor.
     */
    insert(char) {
        if (this.cursor.node.type === 'text') {
            const val = this.cursor.node.value;
            this.cursor.node.value = val.slice(0, this.cursor.offset) + char + val.slice(this.cursor.offset);
            this.cursor.offset += char.length;
        } else {
            // Se o cursor estiver em um container (não texto), cria um nó de texto
            // (Isso geralmente não deve acontecer se a lógica de navegação garantir foco em texto)
        }
        return this.toLaTeX();
    }

    /**
     * Insere uma estrutura (bloco) na posição atual.
     * Ex: 'frac', 'sqrt'
     */
    insertStructure(type) {
        const activeNode = this.cursor.node;

        // 1. Divide o nó de texto atual se necessário
        if (activeNode.type === 'text') {
            const val = activeNode.value;
            const beforeText = val.slice(0, this.cursor.offset);
            const afterText = val.slice(this.cursor.offset);

            // Atualiza nó atual com texto anterior
            activeNode.value = beforeText;

            // Cria estrutura
            const structureNode = this.createNode(type);
            structureNode.parent = activeNode.parent;

            // Preenche filhos da estrutura dependendo do tipo
            if (type === 'frac') {
                const num = this.createNode('block'); // Container para numerador
                num.parent = structureNode;
                num.children.push(this.createEmptyText(num));

                const den = this.createNode('block'); // Container para denominador
                den.parent = structureNode;
                den.children.push(this.createEmptyText(den));

                structureNode.children = [num, den];
            } else if (type === 'sqrt') {
                const content = this.createNode('block');
                content.parent = structureNode;
                content.children.push(this.createEmptyText(content));
                structureNode.children = [content];
            } else if (type === 'sup' || type === 'sub') {
                const content = this.createNode('block');
                content.parent = structureNode;
                content.children.push(this.createEmptyText(content));
                structureNode.children = [content];
            }

            // Nó de texto para o que vem depois
            const nextTextNode = this.createNode('text', afterText);
            nextTextNode.parent = activeNode.parent;

            // Inserir na lista de filhos do pai
            const parent = activeNode.parent;
            const index = parent.children.indexOf(activeNode);

            // Remove activeNode antigo se vazio? Não, mantemos para estabilidade, a menos que limpe
            // Inserimos: activeNode (com texto antes) -> structureNode -> nextTextNode
            parent.children.splice(index + 1, 0, structureNode, nextTextNode);

            // Mover cursor para o primeiro campo da estrutura
            this.cursor.node = structureNode.children[0].children[0]; // Primeiro text node do primeiro bloco
            this.cursor.offset = 0;
        }
        return this.toLaTeX();
    }

    createEmptyText(parent) {
        const t = this.createNode('text', '');
        t.parent = parent;
        return t;
    }

    /**
     * Deleta o caractere anterior ou a estrutura anterior.
     */
    delete() {
        const { node, offset } = this.cursor;

        if (node.type === 'text') {
            if (offset > 0) {
                // Apagar caractere simples
                const val = node.value;
                node.value = val.slice(0, offset - 1) + val.slice(offset);
                this.cursor.offset--;
            } else {
                // Offset 0: estamos no início de um nó de texto
                // Precisamos ver o que tem antes na lista de irmãos
                const parent = node.parent;
                const index = parent.children.indexOf(node);

                if (index > 0) {
                    const prevSibling = parent.children[index - 1];
                    if (prevSibling.type === 'text') {
                        // Merge com texto anterior (raro com essa lógica, mas possível)
                        this.cursor.node = prevSibling;
                        this.cursor.offset = prevSibling.value.length;
                        prevSibling.value += node.value;
                        parent.children.splice(index, 1); // remove o nó atual
                    } else {
                        // O anterior é uma estrutura.
                        // Comportamento: Entrar na estrutura (último campo) OU deletar a estrutura?
                        // Geralmente delete da direita para esquerda deleta a estrutura se estiver "fora"
                        // Vamos deletar a estrutura inteira por enquanto para simplificar "Lego"
                        // OU melhor: entrar nela para editar.
                        // Vamos deletar por enquanto.
                        parent.children.splice(index - 1, 1);
                        // Merge texts
                        if (index > 1 && parent.children[index - 2].type === 'text') {
                            const textBefore = parent.children[index - 2];
                            this.cursor.node = textBefore;
                            this.cursor.offset = textBefore.value.length;
                            textBefore.value += node.value;
                            parent.children.splice(index - 1, 1); // Remove o nó atual que ficou órfão do merge
                        }
                    }
                } else {
                    // Estamos no início de um bloco (ex: numerador).
                    // Se for root, nada a fazer.
                    // Se for um bloco dentro de estrutura, sair para a esquerda?
                    if (parent.type === 'block' && parent.parent.type !== 'root') {
                        // Sair da estrutura para a esquerda (antes dela)
                        this.moveCursorLeft();
                    }
                }
            }
        }
        return this.toLaTeX();
    }

    // --- Navegação ---

    moveCursorLeft() {
        // Implementação simplificada: mover offset ou saltar nós
        const { node, offset } = this.cursor;
        if (offset > 0) {
            this.cursor.offset--;
        } else {
            // Mover para o nó anterior
            const parent = node.parent;
            const index = parent.children.indexOf(node);
            if (index > 0) {
                const prev = parent.children[index - 1];
                if (prev.type === 'text') {
                    this.cursor.node = prev;
                    this.cursor.offset = prev.value.length;
                } else {
                    // Entrar na estrutura (último bloco, último filho)
                    const lastBlock = prev.children[prev.children.length - 1]; // ex: denominador
                    const lastContent = lastBlock.children[lastBlock.children.length - 1];
                    this.cursor.node = lastContent;
                    this.cursor.offset = lastContent.value.length;
                }
            } else {
                // Subir nível (sair do bloco pela esquerda)
                if (parent.type === 'block' && parent.parent) {
                    const structure = parent.parent;
                    const grandParent = structure.parent;
                    const structIndex = grandParent.children.indexOf(structure);
                    if (structIndex > 0) {
                        const textBefore = grandParent.children[structIndex - 1];
                        this.cursor.node = textBefore;
                        this.cursor.offset = textBefore.value.length;
                    }
                }
            }
        }
    }

    moveCursorRight() {
        const { node, offset } = this.cursor;
        if (node.type === 'text' && offset < node.value.length) {
            this.cursor.offset++;
        } else {
            // Fim do nó atual
            const parent = node.parent;
            const index = parent.children.indexOf(node);
            if (index < parent.children.length - 1) {
                const next = parent.children[index + 1];
                if (next.type === 'text') {
                    this.cursor.node = next;
                    this.cursor.offset = 0;
                } else {
                    // Entrar na estrutura (primeiro bloco)
                    const firstBlock = next.children[0];
                    const firstContent = firstBlock.children[0];
                    this.cursor.node = firstContent;
                    this.cursor.offset = 0;
                }
            } else {
                // Sair da estrutura pela direita
                if (parent.type === 'block' && parent.parent) {
                    const structure = parent.parent;
                    const grandParent = structure.parent;
                    const structIndex = grandParent.children.indexOf(structure);
                    if (structIndex < grandParent.children.length - 1) {
                        const textAfter = grandParent.children[structIndex + 1];
                        this.cursor.node = textAfter;
                        this.cursor.offset = 0;
                    }
                }
            }
        }
    }

    // --- Renderização ---

    toLaTeX() {
        return this.renderNode(this.root);
    }

    renderNode(node) {
        if (node.type === 'root') {
            return node.children.map(c => this.renderNode(c)).join('');
        } else if (node.type === 'text') {
            let val = node.value;
            // Injeta cursor se for o nó ativo
            if (this.cursor.node === node) {
                const cursorMarker = '\\\\textcolor{#4FD1C5}{|}'; // Cursor visual
                val = val.slice(0, this.cursor.offset) + cursorMarker + val.slice(this.cursor.offset);
            }
            return val; // Texto puro
        } else if (node.type === 'block') {
            // Bloco genérico (ex: numerador)
            return node.children.map(c => this.renderNode(c)).join('');
        } else if (node.type === 'frac') {
            const num = this.renderNode(node.children[0]);
            const den = this.renderNode(node.children[1]);
            return `\\\\frac{${num}}{${den}}`;
        } else if (node.type === 'sqrt') {
            const content = this.renderNode(node.children[0]);
            return `\\\\sqrt{${content}}`;
        } else if (node.type === 'sup') {
            const content = this.renderNode(node.children[0]);
            return `^{${content}}`;
        } else if (node.type === 'sub') {
            const content = this.renderNode(node.children[0]);
            return `_{${content}}`;
        }
        return '';
    }

    // Limpar tudo
    clear() {
        this.root = this.createNode('root');
        const initialText = this.createNode('text', '');
        initialText.parent = this.root;
        this.root.children.push(initialText);
        this.cursor = { node: initialText, offset: 0 };
        return this.toLaTeX();
    }

    // Carregar um estado existente (se necessário depois)
    load(latex) {
        // TODO: Parser de LaTeX para AST se quisermos editar fórmulas existentes
        // Por enquanto começa vazio
    }
}
