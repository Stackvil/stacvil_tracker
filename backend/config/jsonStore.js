const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Memory cache of collections
const cache = {};

function getFilePath(collectionName) {
  return path.join(DATA_DIR, `${collectionName.toLowerCase()}.json`);
}

function loadCollection(collectionName) {
  const filePath = getFilePath(collectionName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
    cache[collectionName] = [];
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    cache[collectionName] = JSON.parse(raw || '[]');
  } catch (err) {
    console.error(`[jsonStore] Error reading ${collectionName}.json:`, err.message);
    cache[collectionName] = [];
  }
  return cache[collectionName];
}

function saveCollection(collectionName, data) {
  cache[collectionName] = data;
  const filePath = getFilePath(collectionName);
  try {
    // Atomic save via temp file
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// Generate unique Mongo-like 24-char ObjectId hex string
function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// Matching logic supporting $or, $and, $in, $ne, $gt, $gte, $lt, $lte, $regex
function matchesQuery(item, query = {}) {
  if (!query || Object.keys(query).length === 0) return true;

  for (const key of Object.keys(query)) {
    const val = query[key];

    if (key === '$or' && Array.isArray(val)) {
      const matchAny = val.some(subQuery => matchesQuery(item, subQuery));
      if (!matchAny) return false;
      continue;
    }

    if (key === '$and' && Array.isArray(val)) {
      const matchAll = val.every(subQuery => matchesQuery(item, subQuery));
      if (!matchAll) return false;
      continue;
    }

    const itemVal = item[key];

    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof RegExp)) {
      // Operator object
      if ('$in' in val && Array.isArray(val.$in)) {
        if (!val.$in.includes(itemVal)) return false;
      }
      if ('$nin' in val && Array.isArray(val.$nin)) {
        if (val.$nin.includes(itemVal)) return false;
      }
      if ('$ne' in val) {
        if (itemVal === val.$ne) return false;
      }
      if ('$gt' in val) {
        if (!(new Date(itemVal) > new Date(val.$gt))) return false;
      }
      if ('$gte' in val) {
        if (!(new Date(itemVal) >= new Date(val.$gte))) return false;
      }
      if ('$lt' in val) {
        if (!(new Date(itemVal) < new Date(val.$lt))) return false;
      }
      if ('$lte' in val) {
        if (!(new Date(itemVal) <= new Date(val.$lte))) return false;
      }
      if ('$regex' in val) {
        const flags = val.$options || '';
        const regex = new RegExp(val.$regex, flags);
        if (!regex.test(String(itemVal || ''))) return false;
      }
    } else if (val instanceof RegExp) {
      if (!val.test(String(itemVal || ''))) return false;
    } else {
      // Equality match (support string/id comparison)
      if (key === '_id' || key === 'id') {
        if (String(item._id || item.id) !== String(val)) return false;
      } else {
        if (itemVal !== val) return false;
      }
    }
  }
  return true;
}

function updateItemFields(item, updates) {
  if (updates.$set) {
    Object.assign(item, updates.$set);
  }
  if (updates.$inc) {
    for (const [k, v] of Object.entries(updates.$inc)) {
      item[k] = (item[k] || 0) + v;
    }
  }
  if (updates.$push) {
    for (const [k, v] of Object.entries(updates.$push)) {
      if (!Array.isArray(item[k])) item[k] = [];
      item[k].push(v);
    }
  }
  // Direct field updates without operators
  for (const k of Object.keys(updates)) {
    if (!k.startsWith('$')) {
      item[k] = updates[k];
    }
  }
  item.updatedAt = new Date().toISOString();
  return item;
}

// Class creating Document Instance wrapper with .save() method
class Document {
  constructor(collectionName, data = {}) {
    this._collectionName = collectionName;
    Object.assign(this, data);

    if (!this._id && !this.id) {
      this._id = generateId();
      this.id = this._id;
    } else if (this._id && !this.id) {
      this.id = String(this._id);
    } else if (this.id && !this._id) {
      this._id = String(this.id);
    }
  }

  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      return await bcrypt.compare(candidatePassword, this.password);
    }
    return candidatePassword === this.password;
  }

  async save() {
    const list = loadCollection(this._collectionName);
    
    // Hash password if employee & raw password
    if (this._collectionName.toLowerCase() === 'employee' && this.password) {
      if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }
    }

    const plain = { ...this };
    delete plain._collectionName;

    const idx = list.findIndex(item => String(item._id || item.id) === String(plain._id || plain.id));
    if (idx >= 0) {
      plain.updatedAt = new Date().toISOString();
      list[idx] = plain;
    } else {
      plain.createdAt = plain.createdAt || new Date().toISOString();
      plain.updatedAt = new Date().toISOString();
      list.push(plain);
    }

    saveCollection(this._collectionName, list);
    return this;
  }
}

// Chainable Query Builder supporting sort(), select(), limit(), exec()
class QueryBuilder {
  constructor(collectionName, query = {}, isSingle = false) {
    this._collectionName = collectionName;
    this._query = query;
    this._isSingle = isSingle;
    this._sortObj = null;
    this._limitNum = null;
    this._selectObj = null;
  }

  sort(sortObj) {
    this._sortObj = sortObj;
    return this;
  }

  limit(limitNum) {
    this._limitNum = limitNum;
    return this;
  }

  select(selectObj) {
    this._selectObj = selectObj;
    return this;
  }

  async exec() {
    let list = loadCollection(this._collectionName);
    let matched = list.filter(item => matchesQuery(item, this._query));

    if (this._sortObj) {
      const keys = Object.keys(this._sortObj);
      matched.sort((a, b) => {
        for (const k of keys) {
          const dir = this._sortObj[k];
          const valA = a[k];
          const valB = b[k];
          if (valA < valB) return dir > 0 ? -1 : 1;
          if (valA > valB) return dir > 0 ? 1 : -1;
        }
        return 0;
      });
    }

    if (this._limitNum && this._limitNum > 0) {
      matched = matched.slice(0, this._limitNum);
    }

    if (this._isSingle) {
      return matched.length > 0 ? new Document(this._collectionName, matched[0]) : null;
    }

    return matched.map(item => new Document(this._collectionName, item));
  }

  // Thenable for async/await transparently
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

// Create Collection API interface
function createModel(collectionName) {
  return class Model extends Document {
    constructor(data = {}) {
      super(collectionName, data);
    }

    static find(query = {}) {
      return new QueryBuilder(collectionName, query, false);
    }

    static findOne(query = {}) {
      return new QueryBuilder(collectionName, query, true);
    }

    static findById(id) {
      return new QueryBuilder(collectionName, { _id: String(id) }, true);
    }

    static async create(data) {
      if (Array.isArray(data)) {
        const created = [];
        for (const item of data) {
          const doc = new Model(item);
          await doc.save();
          created.push(doc);
        }
        return created;
      }
      const doc = new Model(data);
      await doc.save();
      return doc;
    }

    static async updateOne(query, updates) {
      const list = loadCollection(collectionName);
      const idx = list.findIndex(item => matchesQuery(item, query));
      if (idx >= 0) {
        updateItemFields(list[idx], updates);
        saveCollection(collectionName, list);
        return { modifiedCount: 1, matchedCount: 1 };
      }
      return { modifiedCount: 0, matchedCount: 0 };
    }

    static async updateMany(query, updates) {
      const list = loadCollection(collectionName);
      let count = 0;
      for (const item of list) {
        if (matchesQuery(item, query)) {
          updateItemFields(item, updates);
          count++;
        }
      }
      if (count > 0) {
        saveCollection(collectionName, list);
      }
      return { modifiedCount: count, matchedCount: count };
    }

    static async deleteOne(query) {
      const list = loadCollection(collectionName);
      const idx = list.findIndex(item => matchesQuery(item, query));
      if (idx >= 0) {
        const item = list.splice(idx, 1)[0];
        saveCollection(collectionName, list);
        return { deletedCount: 1, ...item };
      }
      return { deletedCount: 0 };
    }

    static async findByIdAndDelete(id) {
      const list = loadCollection(collectionName);
      const idx = list.findIndex(item => String(item._id || item.id) === String(id));
      if (idx >= 0) {
        const item = list.splice(idx, 1)[0];
        saveCollection(collectionName, list);
        return new Document(collectionName, item);
      }
      return null;
    }

    static async findByIdAndUpdate(id, updates, options = {}) {
      const list = loadCollection(collectionName);
      const idx = list.findIndex(item => String(item._id || item.id) === String(id));
      if (idx >= 0) {
        updateItemFields(list[idx], updates);
        saveCollection(collectionName, list);
        return new Document(collectionName, list[idx]);
      }
      return null;
    }

    static async deleteMany(query = {}) {
      const list = loadCollection(collectionName);
      if (Object.keys(query).length === 0) {
        const count = list.length;
        saveCollection(collectionName, []);
        return { deletedCount: count };
      }
      const remaining = list.filter(item => !matchesQuery(item, query));
      const deletedCount = list.length - remaining.length;
      saveCollection(collectionName, remaining);
      return { deletedCount };
    }

    static async countDocuments(query = {}) {
      const list = loadCollection(collectionName);
      return list.filter(item => matchesQuery(item, query)).length;
    }

    static async distinct(field, query = {}) {
      const list = loadCollection(collectionName);
      const matched = list.filter(item => matchesQuery(item, query));
      const set = new Set(matched.map(item => item[field]).filter(Boolean));
      return Array.from(set);
    }
  };
}

module.exports = {
  createModel,
  loadCollection,
  saveCollection,
  DATA_DIR
};
