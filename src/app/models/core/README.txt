Bloque consistente de metavalores y cinta para JTV 2.0

Archivos:
- meta-value.ts
- symbol-value.ts
- variable-value.ts
- parameter-value.ts
- meta-value-dictionary.ts
- tape.ts

Decisiones aplicadas:
- resolve() devuelve SymbolValue
- Tape trabaja internamente con SymbolValue
- TapeSnapshot sigue siendo serializable como string
- borde izquierdo de la cinta en posición 0
- load(input) deja el cabezal a la derecha de la entrada
- SymbolValue usa registry estático para a-z, 0-9 y #

Siguiente paso recomendado:
- ResultadoEvaluacion
- CondicionEnlace
