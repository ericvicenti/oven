# Oven
A probably-half-baked idea

## Theory
- Cross-platform components and apps can be expressed with a few functions:
    - Act (URI => action)
    - Reduce (state + action => state)
    - Render (state => UI + URI)
- Functions can be declaratively expressed as data in an AST
- A piece of data can be identified with a hash, and changes to data can be tracked over time by creating a chain of hashes and referring to the most recent one
- A namespace is a mutable reference to a hash

Therefore, we can build a data editor that allows for versioning and editing of any data, including the editor component itself


## Implemention
Leaves a lot to the imagination. To see what's here:

```
npm install
npm run build
npm run start
# Open http://localhost:3000/
```

## Contribution
Is welcome, but probably a waste of time!