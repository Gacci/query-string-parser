const { Parser } = require('../dist/index');

const parser = new Parser();

const urls = [
  's:forCampusId:=:(66395abfa6c8f456ce0f1877|63395ab7a6c00056ce0f1877)|s:forCampusId:=:(66395abfa6c8f456ce0f1877|63395ab7a6c00056ce0f1877),s:isbn13:=:9783111108346,s:marking:!=:[pencil,stickers],s:cover:!=:[fair]|s:condition:=:(new|like_new|acceptable),s:binding:=:intact,b:admin:=:true,d:posted:><:[2024-04-01,2024-04-30],n:price:>!<:[0,99.99],s:pages:=:(excellent|very_good),v:userId:!:null,n:stage:>=:(1|2|3|4|5),s:comment:!~:[message me\\:]',
  's:forCampusId:=:(66395abfa6c8f456ce0f1877|63395ab7a6c00056ce0f1877)',
  's:isbn13:=:9783111108346,s:marking:!=:[pencil,stickers]',
  'b:admin:=:true,d:posted:><:[2024-04-01,2024-04-30,2024-12-31],n:price:>!<:[0,99.99]',
  'd:posted:><:[2024-04-01,2024-04-30]',
  'd:posted:<>:[2024-04-01,2024-04-30,2024-12-31]',
  'd:posted:<!>:[2024-04-01,2024-04-30,2024-12-31]',
  'd:posted:=:[2024-04-01,2024-04-30,2024-12-31]',
  's:comment:!~:[message me\\:]',
  's:condition:<>:(new|like_new|acceptable)',
  's:condition:=:(new|like_new|acceptable)',
  's:condition:=:[new|like_new|acceptable]',
  's:condition:=:[new,like_new\\,acceptable]',
  's:binding:<!>:[ok,fair]',
  's:forCampusId:=:(66395abfa6c8f456ce0f1877',
  's:isbn13:=9783111108346',
  's:year:>>:1999',
  's:note:=:Special notes include\\: details',
  'z:unknown:=:value',
].map((url) => {
  try {
    return parser.extract(url)
  }
  catch(e) {
    return null
  }
}).filter((object) => {
  return object;
});


const MongoDBOp = {
  '=': '$eq',
  '!=': '$ne',
  '>': '$gt',
  '>=': '$gte',
  '<': '$lt',
  '<=': '$lte',
  '<>': '$in',
  '<!>': '$nin',
  '~': '$regex',
  '!~': '$not'
};

const exp1 = function(filter, op) {
  const $type = filter.delimiter === '|' ? '$or' : '$and';

  return !filter.multi 
    ? { [filter.field]: { [op]: filter.value } } 
    : { 
      [$type]: filter.value.map(value => ({
        [filter.field]: { [op]: value }
      })) 
    };
};

const builder = function(filter) {
  switch (filter.operator) {
    case '=':
      return exp1(filter, '$eq');
    case '!=':
      return exp1(filter, '$ne');
    case '>':
      return exp1(filter, '$gt');
    case '>=':
      return exp1(filter, '$gte');
    case '<':
      return exp1(filter, '$lt');
    case '<=':
      return exp1(filter, '$lte');
    case '><':
      return { '$and': [
        { [filter.field]: { '$gt': filter.value[0] } },
        { [filter.field]: { '$lt': filter.value[1] } }
      ] };
    case '>!<':
      return { '$or': [
        { [filter.field]: { '$lt': filter.value[0] } },
        { [filter.field]: { '$gt': filter.value[1] } }
      ] };
    case '<>':
      return { [filter.field]: { '$in': filter.value } };
    case '<!>':
      return { [filter.field]: { '$nin': filter.value } };
    case '~': 
      return { [filter.field]: { '$regex': filter.value, '$options': 'i' } }; 
    case '!~':
      return { [filter.field]: { '$not': { '$regex': filter.value, '$options': 'i' } } }; 
    case '!':
      return { [filter.field]: { '$exists': false } };
    case '!!':
      return { [filter.field]: { '$exists': true } };
    default:
      throw new Error(`Unsupported operator: ${filter.operator}`);
  }
};


urls.forEach((exp) => {
  // console.log('\n\n\n\n\n', '---', exp, '---');
  exp.forEach(e => {
    const e2 = JSON.stringify(builder(e));
    console.log(e, '\n', e2, '\n\n\n');

    return e2;
  });
});


// urls.forEach((url) => {
//   try {
//     console.log('\n\n\nURL: ', url, '\n', parser.extract(url));
//   } catch (e) {
//     console.log('\n\n\nERROR: ', url, '\n', e);
//   }
// });

// s:comment:~:\\[message me\\:\\]
