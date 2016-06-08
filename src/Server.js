/*
 * @flow
 */

const express = require('express');
const fs = require('mz/fs');
const {log} = console;
const stringify = require('json-stable-stringify');

const crypto = require('crypto');

import React, { Component } from 'react';

type HSVColor = {
  type: 'HSVColor',
  h: number,
  s: number,
  v: number,
  alpha?: number,
};
type RGBColor = {
  type: 'RGBColor',
  r: number,
  g: number,
  b: number,
  alpha?: number,
};
type ColorConstants = 'red' | 'green' | 'blue';
type Color = ColorConstants | RGBColor | HSVColor;

type OColorStyle = {
  type: 'OColorStyle',
  color: Color,
};

type OBackgroundColorStyle = {
  type: 'OBackgroundColorStyle',
  color: Color,
};

type OTextStyle = OColorStyle | OBackgroundColorStyle;

type OViewStyle = OBackgroundColorStyle;

type OText = string | {
  type: 'OText',
  key?: string,
  children: Array<OText>,
  style?: Array<OTextStyle>,
};

type OView = {
  type: 'OView',
  key?: string,
  children: Array<ONode>,
  style?: Array<OViewStyle>,
};

type OResolvedText = string | {
  type: 'OText',
  key?: string,
  children: Array<OResolvedText>,
  style?: Array<OTextStyle>,
};

type OResolvedView = {
  type: 'OView',
  key?: string,
  children: Array<OResolvedView>,
  style?: Array<OViewStyle>,
};

type ORefNode = {
  type: 'ORefNode',
  key?: string,
  id: string,
};
type ONodeID = string;

type OBoolean = boolean;

type ONode = string | OView | OText | ORefNode;

type OResolvedNode = string | OResolvedView | OResolvedText;

const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OBJECT_DIR = path.join(DATA_DIR, 'objects');
const BOOKMARK_DIR = path.join(DATA_DIR, 'bookmarks');

function _hash(input: Buffer | string): string {
  const shasum = crypto.createHash('sha1');
  shasum.update(input);
  const digest = shasum.digest('hex');
  return digest;
}

try {
  fs.mkdirSync(DATA_DIR);
  fs.mkdirSync(OBJECT_DIR);
  fs.mkdirSync(BOOKMARK_DIR);
} catch (e) {}

async function readBookmark(name: string): Promise<?ONodeID> {
  const bookmarkId = _hash(name);
  const data = await fs.readFile(path.join(BOOKMARK_DIR, bookmarkId)).catch(err => {
    if (err.code === 'ENOENT') {
      return null;
    }
  });
  const id = data && data.toString('utf8');
  return id;
}

async function writeBookmark(name: string, id: ONodeID): Promise<void> {
  return fs.writeFile(path.join(BOOKMARK_DIR, _hash(name)), id);
}

async function readObject(id: ONodeID): Promise<?Buffer> {
  return fs.readFile(path.join(OBJECT_DIR, id)).catch(err => {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  });
}

async function readJSON(id: ONodeID): Promise<?Object> {
  const data = await readObject(id);
  const str = data && data.toString('utf8');
  let JSONData = null;
  if (str) {
    JSONData = JSON.parse(str);
  }
  return JSONData;
}

async function writeObject(data, cb): Promise<ONodeID> {
  const id = _hash(data);
  // todo: check for existence before writing. may be dupe
  return fs.writeFile(path.join(OBJECT_DIR, id), data).then(() => {
    return id;
  });
}

async function writeJSON(node: Object | string, cb): Promise<ONodeID> {
  if (typeof node === 'string') {
    return writeObject(node, cb);
  }
  const nodeData = stringify(node);
  return writeObject(nodeData, cb);
}

function renderViewStyles(styles: ?Array<OViewStyle>) {
  const outputStyle = {};
  if (styles) {
    styles.map(style => {
      if (style.type === 'OBackgroundColorStyle') {
        outputStyle.backgroundColor = style.color;
      }
    });
  }
  return outputStyle;
}

function renderTextStyles(styles: ?Array<OTextStyle>) {
  const outputStyle = {};
  if (styles) {
    styles.map(style => {
      if (style.type === 'OColorStyle') {
        outputStyle.color = style.color;
      }
      if (style.type === 'OBackgroundColorStyle') {
        outputStyle.backgroundColor = style.color;
      }
    });
  }
  return outputStyle;
}

function renderView(node: OResolvedView) {
  return (
    <div style={renderViewStyles(node.style)} key={node.key}>
      {node.children.map(child => renderNode(child))}
    </div>
  );
}

function renderText(node: OResolvedText) {
  if (typeof node === 'string') {
    return node;
  }
  return (
    <span style={renderTextStyles(node.style)} key={node.key}>
      {node.children.map(child => renderNode(child))}
    </span>
  );
}

function renderNode(node: OResolvedNode) {
  if (typeof node === 'string' || node.type === 'OText') {
    return renderText(node);
  }
  if (node.type === 'OView') {
    return renderView(node);
  }
  log('renderign node ', node);
  return (
    <h1>Invalid node type</h1>
  );
}

function nodeToHTML(node: OResolvedNode): string {
  const rendered = renderNode(node);
  if (typeof rendered === 'string') {
    return rendered;
  }
  const html = React.renderToString(rendered);
  return html;
}

async function resolveBoolean(node: OBoolean): Promise<boolean> {
  return false;
}

async function resolveNode(node: ?ONode): Promise<?OResolvedNode> {
  if (!node || typeof node !== 'object') {
    return node;
  }
  log('resoolvv');

  if (node.type === 'ORefNode') {
    const refNode = await readJSON(node.id);
    const resolvedRefNode = await resolveNode(refNode);
    return resolvedRefNode;
  }

  if (node.type === 'OSwitchNode') {
    for (let i = 0; i < node.conditions.length; i++) {
      if (await resolveBoolean(node.conditions[0].condition)) {
        return await resolveNode(node.value);
      }
    }
  }

  if (node.children) {
    return {
      ...node,
      children: await Promise.all(node.children.map(resolveNode)),
    };
  }
  return node;
}

const debugNodeToSet: ONode = {
  type: 'OView',
  style: [
    {type: 'OBackgroundColorStyle', color: 'green'},
  ],
  children: [
    {
      type: 'OText',
      children: [
        'Foo',
        {
          type: 'ORefNode',
          key: 'the_ref',
          id: 'ac1f843df9f1373149ad3237a3f6d7d455468ef2',
        },
        {
          type: 'OText',
          style: [
            {type: 'OColorStyle', color: 'red'},
          ],
          children: ['Bar'],
        },
        'Baz',
      ],
    },
  ],
};
// const debugNodeToSet: ONode = {
//   type: 'OText',
//   style: [
//     {type: 'OBackgroundColorStyle', color: 'blue'},
//   ],
//   children: ['Inner refd node!']
// };
async function initShit(): Promise {
  const nodeId = _hash(stringify(debugNodeToSet));
  const shouldUpload = true;
  const shouldSetAsHomeNode = true;

  if (shouldUpload) {
    const id = await writeJSON(debugNodeToSet);
    log('uploaded json. return id: ', id);
  }
  if (shouldSetAsHomeNode) {
    writeBookmark('home', nodeId);
    log('home bookmark set to '+nodeId);
  }
}

initShit().then((a, b) => {
  log('init shit done ', a, b);
}).catch((a, b) => {
  log('init shit catch ', a, b);
});

const app = express();

app.get('*', async (req, res) => {
  const booId = await readBookmark('home');
  const node = await readJSON(booId);
  const resolved = await resolveNode(node);
  log('noode', resolved);
  let html = '';
  if (resolved) {
    html = nodeToHTML(resolved);
  }
  res.send(html);
});

app.listen(3000, () => {
  log('Listening at http://localhost:3000/');
})
