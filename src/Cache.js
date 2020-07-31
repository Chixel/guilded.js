class Cache {
    constructor() {
        this.cache = [];
    }

    has(id) {
        var result;

        for (var i=0; i<this.cache.length; i++) {
            if(this.cache[i]["id"] == id) {
                result = true;
                break;
            }
        }

        return result;
    }

    get(id) {
        var result;

        for (var i=0; i<this.cache.length; i++) {
            if(this.cache[i]["id"] == id) {
                result = this.cache[i]["entry"];
                break;
            }
        }
        
        return result;
    }

    add(id, entry) {
        this.cache.push({"id":id, "entry":entry});
    }
}

module.exports = Cache;