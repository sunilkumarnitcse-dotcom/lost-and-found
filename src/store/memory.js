// In-memory Demo Mode store.
//
// Used ONLY when MONGODB_URI is not set (see src/config/db.js).
// The real database is MongoDB via Mongoose; this store mimics just
// enough of the Mongoose API used by the routes (find, findOne,
// findById, countDocuments, create, insertMany, findOneAndUpdate,
// updateMany, deleteMany, deleteOne, findByIdAndDelete, save,
// sort, limit, populate, toObject) so the same routes work without
// a database. Data lives only in memory and resets on restart —
// it is a demo, not a replacement for MongoDB.
const crypto = require('crypto');

function newId() {
  return crypto.randomBytes(12).toString('hex');
}

function toComparable(v) {
  if (v instanceof Date) return v.getTime();
  return v;
}

function valuesEqual(a, b) {
  if (a instanceof Date || b instanceof Date) return toComparable(a) === toComparable(b);
  return String(a) === String(b);
}

// Match one document against a Mongoose-style filter.
// Supports: equality, $regex/$options, $gte/$lt, $ne, $text/$search.
function matchDoc(doc, filter) {
  if (!filter) return true;
  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$text') {
      const words = String(cond.$search || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const hay = `${doc.title || ''} ${doc.description || ''}`.toLowerCase();
      if (words.length && !words.some((w) => hay.includes(w))) return false;
      continue;
    }
    const val = doc[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
      if ('$regex' in cond) {
        const re = new RegExp(cond.$regex, cond.$options || '');
        if (!re.test(String(val ?? ''))) return false;
      }
      if ('$gte' in cond && !(toComparable(val) >= toComparable(cond.$gte))) return false;
      if ('$lt' in cond && !(toComparable(val) < toComparable(cond.$lt))) return false;
      if ('$ne' in cond && valuesEqual(val, cond.$ne)) return false;
      continue;
    }
    if (!valuesEqual(val, cond)) return false;
  }
  return true;
}

function applyUpdate(doc, update) {
  if (!update) return;
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v;
  }
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) doc[k] = v;
  }
  for (const [k, v] of Object.entries(update)) {
    if (!k.startsWith('$')) doc[k] = v;
  }
  doc.updatedAt = new Date();
}

// Registry of memory collections, so populate() can resolve refs.
const collections = {};

class MemoryQuery {
  constructor(Model, filter) {
    this.Model = Model;
    this.filter = filter || {};
    this._sort = null;
    this._limit = null;
    this._populate = null;
  }
  sort(spec) { this._sort = spec; return this; }
  limit(n) { this._limit = n; return this; }
  populate(path, fields) { this._populate = { path, fields }; return this; }
  _resolve() {
    let docs = this.Model._docs.filter((d) => matchDoc(d, this.filter));
    if (this._sort) {
      const entries = Object.entries(this._sort);
      docs = [...docs].sort((a, b) => {
        for (const [key, dir] of entries) {
          const av = toComparable(a[key]);
          const bv = toComparable(b[key]);
          if (av < bv) return dir === -1 ? 1 : -1;
          if (av > bv) return dir === -1 ? -1 : 1;
        }
        return 0;
      });
    }
    if (this._limit != null) docs = docs.slice(0, this._limit);
    if (this._populate) {
      const { path, fields } = this._populate;
      const RefModel = path === 'item' ? collections.Item : null;
      const wanted = fields ? fields.split(' ').filter(Boolean) : null;
      docs = docs.map((d) => {
        const copy = { ...d };
        const ref = RefModel ? RefModel._docs.find((x) => String(x._id) === String(d[path])) : null;
        if (ref) {
          copy[path] = wanted
            ? Object.fromEntries([['_id', ref._id], ...wanted.filter((f) => f !== '_id').map((f) => [f, ref[f]])])
            : { ...ref };
        }
        return copy;
      });
    }
    return docs;
  }
  then(resolve, reject) {
    try { return Promise.resolve(this._resolve()).then(resolve, reject); }
    catch (err) { return Promise.reject(err).then(resolve, reject); }
  }
  catch(reject) { return this.then(undefined, reject); }
}

function createMemoryModel(name, { defaults = {}, methods = {}, unique = [] } = {}) {
  const store = [];
  collections[name] = { _docs: store };

  class MemoryModel {
    constructor(data = {}) {
      const now = new Date();
      Object.assign(this, defaults);
      Object.assign(this, data);
      if (!this._id) this._id = newId();
      if (!this.createdAt) this.createdAt = now;
      if (!this.updatedAt) this.updatedAt = now;
    }
    toObject() {
      const obj = {};
      for (const k of Object.keys(this)) obj[k] = this[k];
      return obj;
    }
    async save() {
      for (const keys of unique) {
        const clash = store.find((d) => d !== this && keys.every((k) => valuesEqual(d[k], this[k])));
        if (clash) {
          const err = new Error('Duplicate value for a unique field.');
          err.code = 11000;
          throw err;
        }
      }
      this.updatedAt = new Date();
      if (!store.includes(this)) store.push(this);
      return this;
    }
    static get _docs() { return store; }
    static find(filter) { return new MemoryQuery(MemoryModel, filter); }
    static async findOne(filter) {
      return store.find((d) => matchDoc(d, filter || {})) || null;
    }
    static async findById(id) {
      return store.find((d) => String(d._id) === String(id)) || null;
    }
    static async countDocuments(filter) {
      return store.filter((d) => matchDoc(d, filter || {})).length;
    }
    static async create(data) {
      const doc = new MemoryModel(data);
      await doc.save();
      return doc;
    }
    static async insertMany(arr) {
      const docs = [];
      for (const data of arr) docs.push(await MemoryModel.create(data));
      return docs;
    }
    static async findOneAndUpdate(filter, update, opts = {}) {
      let doc = store.find((d) => matchDoc(d, filter || {}));
      if (!doc && opts.upsert) {
        doc = new MemoryModel({ ...filter });
        store.push(doc);
      }
      if (!doc) return null;
      applyUpdate(doc, update);
      return opts.new ? doc : doc;
    }
    static async updateMany(filter, update) {
      let n = 0;
      for (const d of store) {
        if (matchDoc(d, filter || {})) { applyUpdate(d, update); n += 1; }
      }
      return { modifiedCount: n };
    }
    static async deleteMany(filter) {
      let n = 0;
      for (let i = store.length - 1; i >= 0; i -= 1) {
        if (matchDoc(store[i], filter || {})) { store.splice(i, 1); n += 1; }
      }
      return { deletedCount: n };
    }
    static async deleteOne(filter) {
      const i = store.findIndex((d) => matchDoc(d, filter || {}));
      if (i >= 0) store.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    }
    static async findByIdAndDelete(id) {
      const i = store.findIndex((d) => String(d._id) === String(id));
      if (i < 0) return null;
      return store.splice(i, 1)[0];
    }
  }

  for (const [k, fn] of Object.entries(methods)) {
    MemoryModel.prototype[k] = fn;
  }
  collections[name] = MemoryModel;
  return MemoryModel;
}

module.exports = { createMemoryModel };
