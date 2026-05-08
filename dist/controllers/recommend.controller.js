"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getForYouRecommend = exports.getHybridRecommend = exports.getSearchBasedRecommend = exports.getCollaborativeRecommend = exports.getContentBasedRecommend = void 0;
exports.getTrendingByCategory = getTrendingByCategory;
exports.getContentBasedRecommendations = getContentBasedRecommendations;
exports.getCollaborativeRecommendations = getCollaborativeRecommendations;
exports.getSearchBasedRecommendations = getSearchBasedRecommendations;
exports.getHybridRecommendations = getHybridRecommendations;
exports.getForYouRecommendations = getForYouRecommendations;
const natural_1 = __importDefault(require("natural"));
const post_model_1 = __importDefault(require("../models/post.model"));
const userInteraction_model_1 = __importDefault(require("../models/userInteraction.model"));
const recommendation_cache_1 = require("../cache/recommendation.cache");
const category_model_1 = __importDefault(require("../models/category.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const console_1 = __importDefault(require("console"));
function getCategoryBoost(baseCatId, targetCatId, catMap) {
    if (baseCatId === targetCatId)
        return 1;
    const baseCat = catMap.get(baseCatId);
    const targetCat = catMap.get(targetCatId);
    if (!baseCat || !targetCat)
        return 0.8;
    if (baseCat.parentId?.toString() === targetCatId ||
        targetCat.parentId?.toString() === baseCatId) {
        return 0.9;
    }
    if (baseCat.parentId &&
        targetCat.parentId &&
        baseCat.parentId.toString() === targetCat.parentId.toString()) {
        return 0.9;
    }
    return 0.8;
}
function normalizeText(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function buildText(post) {
    return normalizeText(`
      ${post.title || ""}
      ${post.description || ""}
    `);
}
function cosine(a, b) {
    if (!a.length || !b.length)
        return 0;
    let dot = 0;
    let ma = 0;
    let mb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        ma += a[i] * a[i];
        mb += b[i] * b[i];
    }
    const denom = Math.sqrt(ma) * Math.sqrt(mb);
    return denom ? dot / denom : 0;
}
function locationScore(a, b) {
    if (!a?.location || !b?.location)
        return 0;
    if (a.location.wardCode === b.location.wardCode)
        return 1;
    if (a.location.provinceCode === b.location.provinceCode)
        return 0.7;
    return 0.2;
}
function priceScore(a, b) {
    if (!a?.price || !b?.price)
        return 0;
    const diff = Math.abs(a.price - b.price);
    const max = Math.max(a.price, b.price);
    return Math.max(0, 1 - diff / (max + 1));
}
function categoryScore(a, b) {
    return a.category?.toString() === b.category?.toString() ? 1 : 0;
}
function conditionScore(item) {
    const c = item.condition;
    if (!c)
        return 0.5;
    const base = (c.percentage || 50) / 100;
    const bonus = (c.isFullbox ? 0.1 : 0) +
        (c.warranty && c.warranty !== "Không bảo hành" ? 0.1 : 0);
    return Math.min(base + bonus, 1);
}
function popularityScore(item) {
    const views = item.views || 0;
    return Math.min(Math.log1p(views) / Math.log1p(10000), 1);
}
const HALF_LIFE_DAYS = 7;
const DECAY_LAMBDA = Math.LN2 / HALF_LIFE_DAYS;
function timeDecay(date) {
    const daysDiff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-DECAY_LAMBDA * daysDiff);
}
const ACTIVE_STATUS_FILTER = {
    status: { $in: ["active"] },
};
async function getBaseAndPosts(itemId) {
    const baseItem = await post_model_1.default.findById(itemId);
    if (!baseItem) {
        throw new Error("Base item not found");
    }
    const posts = await post_model_1.default.find({
        _id: { $ne: itemId },
        ...ACTIVE_STATUS_FILTER,
    })
        .limit(300)
        .lean();
    return {
        baseItem,
        posts,
    };
}
async function getTrendingByCategory(categoryId, excludeItemId, limit = 20) {
    let sourcePost = null;
    if (excludeItemId) {
        sourcePost = await post_model_1.default.findById(excludeItemId).select("title").lean();
        if (!sourcePost) {
            sourcePost = null;
        }
    }
    if (sourcePost && sourcePost.title) {
        const keyword = sourcePost.title.trim();
        if (keyword.length > 0) {
            const posts = await post_model_1.default.aggregate([
                {
                    $search: {
                        index: "search",
                        compound: {
                            should: [
                                {
                                    autocomplete: {
                                        query: keyword,
                                        path: "title",
                                        fuzzy: { maxEdits: 1 },
                                        score: { boost: { value: 10 } },
                                    },
                                },
                                {
                                    text: {
                                        query: keyword,
                                        path: "title",
                                        score: { boost: { value: 5 } },
                                    },
                                },
                            ],
                            filter: [
                                {
                                    equals: {
                                        path: "category",
                                        value: new mongoose_1.default.Types.ObjectId(categoryId),
                                    },
                                },
                            ],
                        },
                    },
                },
                {
                    $match: {
                        _id: { $ne: new mongoose_1.default.Types.ObjectId(excludeItemId) },
                        status: "active",
                    },
                },
                {
                    $addFields: {
                        searchScore: { $meta: "searchScore" },
                    },
                },
                {
                    $sort: {
                        searchScore: -1,
                        views: -1,
                    },
                },
                {
                    $limit: limit,
                },
            ]);
            if (posts.length > 0) {
                return posts.map((post) => {
                    const popularity = popularityScore(post);
                    const normSearch = Math.log1p(post.searchScore || 0) / Math.log1p(100);
                    const finalScore = 0.7 * normSearch + 0.3 * popularity;
                    return {
                        ...post,
                        score: Number(finalScore.toFixed(4)),
                        debug: {
                            searchScore: post.searchScore,
                            normSearch: Number(normSearch.toFixed(4)),
                            popularity: Number(popularity.toFixed(4)),
                            source: "similar_title",
                        },
                    };
                });
            }
        }
    }
    const query = { category: categoryId, status: "active" };
    if (excludeItemId) {
        query._id = { $ne: excludeItemId };
    }
    const trendingPosts = await post_model_1.default.find(query)
        .sort({ views: -1, createdAt: -1 })
        .limit(limit)
        .lean();
    return trendingPosts.map((post, idx) => ({
        ...post,
        score: Number((1 - idx / limit).toFixed(4)),
        debug: {
            source: "trending_fallback",
            rank: idx + 1,
        },
    }));
}
async function getContentBasedRecommendations(itemId) {
    const { baseItem, posts } = await getBaseAndPosts(itemId);
    const tfidf = new natural_1.default.TfIdf();
    const allPosts = [baseItem.toObject(), ...posts];
    allPosts.forEach((post) => {
        tfidf.addDocument(buildText(post));
    });
    const vocabulary = new Set();
    allPosts.forEach((post) => {
        buildText(post)
            .split(" ")
            .forEach((w) => {
            if (w)
                vocabulary.add(w);
        });
    });
    const terms = Array.from(vocabulary);
    function getVector(docIndex) {
        return terms.map((term) => {
            const val = tfidf.tfidf(term, docIndex);
            return isFinite(val) && !isNaN(val) ? val : 0;
        });
    }
    const baseVec = getVector(0);
    const result = posts.map((post, index) => {
        const vec = getVector(index + 1);
        const tfidfSim = cosine(baseVec, vec);
        const category = categoryScore(baseItem, post);
        const price = priceScore(baseItem, post);
        const location = locationScore(baseItem, post);
        const condition = conditionScore(post);
        const popularity = popularityScore(post);
        const finalScore = 0.4 * tfidfSim +
            0.2 * category +
            0.15 * price +
            0.1 * location +
            0.1 * condition +
            0.05 * popularity;
        return {
            ...post,
            score: Number(finalScore.toFixed(4)),
            debug: {
                tfidfSim: Number(tfidfSim.toFixed(4)),
                category: Number(category.toFixed(4)),
                price: Number(price.toFixed(4)),
                location: Number(location.toFixed(4)),
                condition: Number(condition.toFixed(4)),
                popularity: Number(popularity.toFixed(4)),
            },
        };
    });
    const finalResult = result.sort((a, b) => b.score - a.score).slice(0, 20);
    return finalResult;
}
function getCategoryBonus(baseCatId, targetCatId, catMap) {
    if (baseCatId === targetCatId)
        return 1.0;
    const baseCat = catMap.get(baseCatId);
    const targetCat = catMap.get(targetCatId);
    if (!baseCat || !targetCat)
        return 0.7;
    if (baseCat.parentId?.toString() === targetCatId ||
        targetCat.parentId?.toString() === baseCatId) {
        return 0.9;
    }
    if (baseCat.parentId &&
        targetCat.parentId &&
        baseCat.parentId.toString() === targetCat.parentId.toString()) {
        return 0.8;
    }
    return 0.7;
}
// Helper: tính cosine similarity giữa hai vector (sparse)
function cosineSimilarity(vecA, vecB) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const [user, weightA] of vecA.entries()) {
        const weightB = vecB.get(user) || 0;
        dot += weightA * weightB;
        normA += weightA * weightA;
    }
    for (const weightB of vecB.values()) {
        normB += weightB * weightB;
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
// Xây dựng vector trọng số user -> weight cho một item
async function buildItemVector(itemId, interactions, typeWeight) {
    const vector = new Map();
    // Bước 1: Tính tổng trọng số tuyến tính trước
    for (const inter of interactions) {
        if (inter.post?.toString() !== itemId)
            continue;
        const userId = inter.user.toString();
        const weight = (typeWeight[inter.type] || 1) *
            timeDecay(inter.createdAt) *
            (inter.score || 1);
        vector.set(userId, (vector.get(userId) || 0) + weight);
    }
    // Bước 2: Sau khi có tổng, mới thực hiện Log Scaling để nén dữ liệu
    for (const [userId, totalWeight] of vector.entries()) {
        // Sử dụng Math.log1p(x) tương đương với Math.log(1 + x)
        vector.set(userId, Math.log1p(totalWeight));
    }
    return vector;
}
async function getCollaborativeRecommendations(itemId) {
    const baseItem = await post_model_1.default.findById(itemId).select("category").lean();
    if (!baseItem)
        return [];
    const baseCategoryId = baseItem.category.toString();
    const allCategories = await category_model_1.default.find().lean();
    const catMap = new Map(allCategories.map((c) => [c._id.toString(), c]));
    const interactions = await userInteraction_model_1.default.find({
        post: { $ne: null },
        type: { $in: ["view", "like", "save", "chat", "purchase"] },
    })
        .select("user post type score createdAt")
        .lean();
    if (!interactions.length) {
        return getTrendingByCategory(baseCategoryId, itemId);
    }
    const typeWeight = {
        view: 1,
        like: 3,
        save: 4,
        chat: 5,
        purchase: 10,
    };
    // Xây dựng vector cho item gốc
    const baseVector = await buildItemVector(itemId, interactions, typeWeight);
    if (baseVector.size === 0) {
        return getTrendingByCategory(baseCategoryId, itemId);
    }
    // console.log("baseVector", baseVector);
    // Tìm tất cả user đã tương tác với item gốc
    const relevantUsers = new Set(baseVector.keys());
    // Tìm tất cả item khác mà các user này đã tương tác
    const candidateItems = new Set();
    for (const inter of interactions) {
        const userId = inter.user.toString();
        const postId = inter.post?.toString();
        if (relevantUsers.has(userId) && postId && postId !== itemId) {
            candidateItems.add(postId);
        }
    }
    if (candidateItems.size === 0) {
        return getTrendingByCategory(baseCategoryId, itemId);
    }
    // Xây dựng vector cho từng candidate item (có thể tính song song hoặc batch)
    const candidateVectors = new Map();
    for (const candId of candidateItems) {
        const vec = await buildItemVector(candId, interactions, typeWeight);
        if (vec.size > 0)
            candidateVectors.set(candId, vec);
    }
    // console.log("candidateVectors", candidateVectors);
    // Tính similarity giữa base item và từng candidate
    const similarities = [];
    for (const [candId, vec] of candidateVectors.entries()) {
        const sim = cosineSimilarity(baseVector, vec);
        if (sim > 0)
            similarities.push({ id: candId, sim });
    }
    // Sắp xếp giảm dần theo similarity
    similarities.sort((a, b) => b.sim - a.sim);
    // console.log("similarities", similarities);
    const topCandidates = similarities.slice(0, 30); // lấy nhiều hơn 20 để sau còn lọc category
    if (topCandidates.length === 0) {
        return getTrendingByCategory(baseCategoryId, itemId);
    }
    // Lấy thông tin category của các candidate
    const candidateIds = topCandidates.map((c) => c.id);
    const candidatePosts = await post_model_1.default.find({ _id: { $in: candidateIds } })
        .select("category")
        .lean();
    const postCatMap = new Map(candidatePosts.map((p) => [p._id.toString(), p.category.toString()]));
    // Tính final score = similarity * categoryBonus
    const scored = topCandidates.map(({ id, sim }) => {
        let bonus = 1.0;
        const catId = postCatMap.get(id);
        if (catId) {
            bonus = getCategoryBonus(baseCategoryId, catId, catMap);
        }
        const finalScore = sim * bonus;
        return {
            _id: id,
            score: Number(finalScore.toFixed(4)),
            debug: {
                similarity: Number(sim.toFixed(4)),
                bonus,
                method: "item_item_cf_category_boost",
            },
        };
    });
    const sorted = scored.sort((a, b) => b.score - a.score).slice(0, 20);
    // Lấy full post object
    const posts = await post_model_1.default.find({
        _id: { $in: sorted.map((x) => x._id) },
    }).lean();
    const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
    return sorted
        .map((x) => {
        const p = postMap.get(x._id);
        if (!p)
            return null;
        return { ...p, score: x.score, debug: x.debug };
    })
        .filter(Boolean);
}
async function getSearchBasedRecommendations(userId) {
    const searches = await userInteraction_model_1.default.find({
        user: userId,
        type: "search",
        normalizedKeyword: { $ne: null },
    })
        .select("normalizedKeyword createdAt score")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    if (!searches.length)
        return [];
    /**
     * =====================================
     * 1. BUILD KEYWORD WEIGHTS (DEDUPED)
     * =====================================
     */
    const keywordMap = new Map();
    for (const x of searches) {
        const keyword = x.normalizedKeyword?.toLowerCase().trim();
        if (!keyword)
            continue;
        const decay = timeDecay(x.createdAt);
        const weight = (x.score || 1) * decay;
        keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + weight);
    }
    const topKeywords = [...keywordMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    if (!topKeywords.length)
        return [];
    const shouldQueries = [];
    for (const [keyword, weight] of topKeywords) {
        const boost = Math.log1p(weight) * 5;
        shouldQueries.push({
            autocomplete: {
                query: keyword,
                path: "title",
                // fuzzy: { maxEdits: 1 },
                score: {
                    boost: { value: boost * 2 },
                },
            },
        });
        // shouldQueries.push({
        //   text: {
        //     query: keyword,
        //     path: "description",
        //     score: {
        //       boost: { value: boost },
        //     },
        //   },
        // });
    }
    /**
     * =====================================
     * 3. ATLAS SEARCH
     * =====================================
     */
    const posts = await post_model_1.default.aggregate([
        {
            $search: {
                index: "search",
                compound: {
                    should: shouldQueries,
                },
            },
        },
        {
            $addFields: {
                atlasScore: { $meta: "searchScore" },
            },
        },
        {
            $sort: {
                atlasScore: -1,
                views: -1,
            },
        },
        { $limit: 50 },
        { $match: { status: "active" } },
    ]);
    /**
     * =====================================
     * 4. NORMALIZE + FINAL SCORE
     * =====================================
     */
    const result = posts.map((post) => {
        const popularity = popularityScore(post);
        // log normalization (stable hơn linear /20)
        const searchScore = Math.log1p(post.atlasScore || 0) / Math.log1p(100); // stable scale 0-1
        const finalScore = 0.95 * searchScore + 0.05 * popularity;
        return {
            ...post,
            score: Number(finalScore.toFixed(4)),
            debug: {
                atlasScore: post.atlasScore,
                searchScore: Number(searchScore.toFixed(4)),
                popularity: Number(popularity.toFixed(4)),
                keywords: topKeywords.map((k) => k[0]),
            },
        };
    });
    /**
     * =====================================
     * 5. SORT FINAL
     * =====================================
     */
    return result.sort((a, b) => b.score - a.score).slice(0, 20);
}
async function getHybridRecommendations(itemId, userId) {
    const [contentResult, collaborativeResult, searchResult] = await Promise.all([
        getContentBasedRecommendations(itemId),
        getCollaborativeRecommendations(itemId),
        userId ? getSearchBasedRecommendations(userId) : Promise.resolve([]),
    ]);
    const wContent = 0.7;
    const wCollab = 0.3;
    const scoreMap = new Map();
    contentResult.forEach((item) => {
        scoreMap.set(item._id.toString(), {
            item: item,
            contentScore: item.score,
            collaborativeScore: 0,
            searchScore: 0,
        });
    });
    collaborativeResult.forEach((item) => {
        const id = item._id.toString();
        const existing = scoreMap.get(id);
        if (existing) {
            existing.collaborativeScore = item.score;
        }
        else {
            scoreMap.set(id, {
                item: item,
                contentScore: 0,
                collaborativeScore: item.score,
                searchScore: 0,
            });
        }
    });
    searchResult.forEach((item) => {
        const id = item._id.toString();
        const existing = scoreMap.get(id);
        if (existing) {
            existing.searchScore = item.score;
        }
        else {
            scoreMap.set(id, {
                item: item,
                contentScore: 0,
                collaborativeScore: 0,
                searchScore: item.score,
            });
        }
    });
    const result = Array.from(scoreMap.values()).map((x) => {
        const finalScore = wContent * x.contentScore + wCollab * x.collaborativeScore;
        return {
            ...x.item,
            score: Number(finalScore.toFixed(4)),
            debug: {
                contentScore: Number(x.contentScore.toFixed(4)),
                collaborativeScore: Number(x.collaborativeScore.toFixed(4)),
            },
        };
    });
    return result.sort((a, b) => b.score - a.score).slice(0, 20);
}
async function validateRecommendationCache(data, minItems = 1) {
    if (!data?.length)
        return null;
    const ids = data.map((x) => x._id);
    const activePosts = await post_model_1.default.find({
        _id: { $in: ids },
        status: "active",
    })
        .select("_id")
        .lean();
    const activeSet = new Set(activePosts.map((x) => x._id.toString()));
    const filtered = data.filter((x) => activeSet.has(x._id.toString()));
    if (filtered.length < minItems) {
        return null;
    }
    return filtered;
}
const getContentBasedRecommend = async (req, res) => {
    try {
        const itemId = (req.params.id || req.query.itemId);
        const cacheKey = recommendation_cache_1.CacheKey.content(itemId);
        /**
         * =====================================
         * 1. GET CACHE
         * =====================================
         */
        let data = await (0, recommendation_cache_1.getPrecomputed)(cacheKey);
        /**
         * =====================================
         * 2. VALIDATE ACTIVE POSTS
         * =====================================
         */
        data = await validateRecommendationCache(data);
        let source = "cache";
        /**
         * =====================================
         * 3. RECOMPUTE IF INVALID
         * =====================================
         */
        if (!data) {
            source = "recomputed";
            data = await getContentBasedRecommendations(itemId);
            await (0, recommendation_cache_1.cacheOrFetch)(cacheKey, recommendation_cache_1.TTL.HYBRID_RESULT, async () => data);
        }
        return res.json({
            success: true,
            type: "content-based",
            source,
            data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getContentBasedRecommend = getContentBasedRecommend;
const getCollaborativeRecommend = async (req, res) => {
    try {
        const itemId = (req.params.id || req.query.itemId);
        const cacheKey = recommendation_cache_1.CacheKey.collaborative(itemId);
        /**
         * =====================================
         * 1. GET FROM CACHE
         * =====================================
         */
        let data = await (0, recommendation_cache_1.getPrecomputed)(cacheKey);
        /**
         * =====================================
         * 2. VALIDATE ACTIVE POSTS
         * =====================================
         */
        if (data?.length) {
            const ids = data.map((x) => x._id);
            const activePosts = await post_model_1.default.find({
                _id: { $in: ids },
                status: "active",
            })
                .select("_id")
                .lean();
            // console.log("Active posts:", activePosts.length);
            const activeSet = new Set(activePosts.map((x) => x._id.toString()));
            data = data.filter((x) => activeSet.has(x._id.toString()));
        }
        /**
         * =====================================
         * 3. RECOMPUTE IF CACHE INVALID
         * =====================================
         */
        if (!data || data.length < 1) {
            data = await getCollaborativeRecommendations(itemId);
            await (0, recommendation_cache_1.cacheOrFetch)(cacheKey, recommendation_cache_1.TTL.HYBRID_RESULT, async () => data);
        }
        /**
         * =====================================
         * 4. RETURN
         * =====================================
         */
        return res.json({
            success: true,
            type: "collaborative",
            source: data.length ? "cache" : "recomputed",
            data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getCollaborativeRecommend = getCollaborativeRecommend;
const getSearchBasedRecommend = async (req, res) => {
    try {
        const userId = (req.params.id || req.query.userId);
        const data = await getSearchBasedRecommendations(userId);
        return res.json({
            success: true,
            type: "search-based",
            data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getSearchBasedRecommend = getSearchBasedRecommend;
const getHybridRecommend = async (req, res) => {
    try {
        const itemId = (req.params.id || req.query.itemId);
        const userId = req.user?._id?.toString();
        const cacheKey = recommendation_cache_1.CacheKey.hybrid(itemId);
        /**
         * =====================================
         * 1. GET CACHE
         * =====================================
         */
        let data = await (0, recommendation_cache_1.getPrecomputed)(cacheKey);
        /**
         * =====================================
         * 2. VALIDATE ACTIVE POSTS
         * =====================================
         */
        data = await validateRecommendationCache(data);
        let source = "cache";
        /**
         * =====================================
         * 3. RECOMPUTE IF CACHE INVALID
         * =====================================
         */
        if (!data) {
            source = "recomputed";
            data = await getHybridRecommendations(itemId, userId);
            await (0, recommendation_cache_1.cacheOrFetch)(cacheKey, recommendation_cache_1.TTL.HYBRID_RESULT, async () => data);
        }
        return res.json({
            success: true,
            type: "hybrid",
            source,
            data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getHybridRecommend = getHybridRecommend;
// Hàm chính: For You recommendations cho một user
// export async function getForYouRecommendations(
//   userId: string,
//   limit: number = 20,
// ): Promise<ScoreItemResponse[]> {
//   // 1. Lấy lịch sử tương tác của user (có trọng số theo loại + thời gian)
//   // const interactions = await UserInteraction.aggregate([
//   //   {
//   //     $match: {
//   //       user: new mongoose.Types.ObjectId(userId),
//   //       post: { $ne: null },
//   //       type: {
//   //         $in: ["view", "like", "save", "chat", "purchase"],
//   //       },
//   //     },
//   //   },
//   //   {
//   //     $lookup: {
//   //       from: "posts",
//   //       localField: "post",
//   //       foreignField: "_id",
//   //       as: "postData",
//   //     },
//   //   },
//   //   {
//   //     $unwind: "$postData",
//   //   },
//   //   {
//   //     $match: {
//   //       "postData.status": "active",
//   //     },
//   //   },
//   //   {
//   //     $sort: {
//   //       createdAt: -1,
//   //     },
//   //   },
//   //   {
//   //     $project: {
//   //       post: 1,
//   //       type: 1,
//   //       score: 1,
//   //       createdAt: 1,
//   //     },
//   //   },
//   // ]);
//   const interactions = await UserInteraction.find({
//     user: new mongoose.Types.ObjectId(userId),
//     post: { $ne: null },
//     type: {
//       $in: ["view", "like", "save", "chat", "purchase"],
//     },
//   })
//     .lean()
//     .sort({ createdAt: -1 })
//     .limit(100);
//   if (!interactions.length) {
//     // User mới hoàn toàn: trả về trending chung
//     return getTrendingGeneral(limit);
//   }
//   const typeWeight: Record<string, number> = {
//     view: 1,
//     like: 3,
//     save: 4,
//     chat: 5,
//     purchase: 10,
//   };
//   // 2. Tính weight cho từng item user đã tương tác
//   //    và thu thập các category user quan tâm
//   const userItemWeights = new Map<string, number>(); // itemId -> total weight
//   const userCategoryWeights = new Map<string, number>(); // categoryId -> weight
//   for (const inter of interactions) {
//     const postId = inter.post?.toString();
//     if (!postId) continue;
//     const weight =
//       (typeWeight[inter.type] || 1) *
//       timeDecay(inter.createdAt) *
//       (inter.score || 1);
//     userItemWeights.set(postId, (userItemWeights.get(postId) || 0) + weight);
//     // Lấy category của post (có thể cache để tránh query nhiều)
//     const post = await Post.findById(postId).select("category").lean();
//     if (post) {
//       const catId = post.category.toString();
//       userCategoryWeights.set(
//         catId,
//         (userCategoryWeights.get(catId) || 0) + weight,
//       );
//     }
//   }
//   const interactedItemIds = new Set(userItemWeights.keys());
//   // 3. Item-based CF: tìm items tương tự với những items user đã tương tác
//   const candidateScores = new Map<string, number>(); // itemId -> accumulated score
//   // Lấy top 10 items user tương tác mạnh nhất (có trọng số cao)
//   const topUserItems = Array.from(userItemWeights.entries())
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 10);
//   for (const [itemId, userWeight] of topUserItems) {
//     console.log(itemId);
//     const similarItems = await getSimilarItems(itemId, 0, 30);
//     for (const sim of similarItems) {
//       if (interactedItemIds.has(sim.id)) continue;
//       const contribution = sim.similarity * userWeight;
//       candidateScores.set(
//         sim.id,
//         (candidateScores.get(sim.id) || 0) + contribution,
//       );
//     }
//   }
//   // 4. Content-based boost: thêm items từ các category user yêu thích
//   // const totalCatWeight = Array.from(userCategoryWeights.values()).reduce(
//   //   (a, b) => a + b,
//   //   0,
//   // );
//   // if (totalCatWeight > 0) {
//   //   const preferredCategories = Array.from(userCategoryWeights.entries())
//   //     .map(([catId, w]) => ({ catId, ratio: w / totalCatWeight }))
//   //     .filter((c) => c.ratio >= 0.05); // chỉ lấy category chiếm >5% sở thích
//   //   if (preferredCategories.length > 0) {
//   //     const categoryItems = await Post.find({
//   //       category: { $in: preferredCategories.map((c) => c.catId) },
//   //       _id: { $nin: Array.from(interactedItemIds) },
//   //     })
//   //       .select("_id category")
//   //       .limit(limit * 2)
//   //       .lean();
//   //     for (const item of categoryItems) {
//   //       const catId = item.category.toString();
//   //       const catRatio =
//   //         preferredCategories.find((c) => c.catId === catId)?.ratio || 0;
//   //       // Boost thêm dựa trên mức độ yêu thích category
//   //       candidateScores.set(
//   //         item._id.toString(),
//   //         (candidateScores.get(item._id.toString()) || 0) + catRatio * 10,
//   //       );
//   //     }
//   //   }
//   // }
//   // 5. Fallback: nếu vẫn chưa đủ candidate, thêm trending items
//   if (candidateScores.size < limit) {
//     const trending = await getTrendingGeneral(limit * 2);
//     for (const item of trending) {
//       const id = item._id.toString();
//       if (!interactedItemIds.has(id) && !candidateScores.has(id)) {
//         candidateScores.set(id, (candidateScores.get(id) || 0) + 0.5);
//       }
//     }
//   }
//   if (candidateScores.size === 0) {
//     return getTrendingGeneral(limit);
//   }
//   // 6. Lấy chi tiết posts và tính final score
//   const candidateIds = Array.from(candidateScores.keys());
//   const posts = await Post.find({
//     _id: { $in: candidateIds },
//     status: "active",
//   }).lean();
//   const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
//   const results = Array.from(candidateScores.entries())
//     .map(([id, rawScore]) => {
//       const post = postMap.get(id);
//       if (!post) return null;
//       // Có thể thêm category bonus dựa trên sở thích user
//       const catId = post.category.toString();
//       const categoryPreference = userCategoryWeights.get(catId) || 0;
//       const finalScore = rawScore * (1 + Math.log(1 + categoryPreference) / 10);
//       return {
//         ...post,
//         score: Number(finalScore.toFixed(4)),
//         debug: {
//           rawScore: Number(rawScore.toFixed(4)),
//           categoryPreference,
//           method: "hybrid_for_you",
//         },
//       };
//     })
//     .filter((item): item is ScoreItemResponse => item !== null)
//     .sort((a, b) => b.score - a.score)
//     .slice(0, limit) as ScoreItemResponse[];
//   return results;
// }
async function getForYouRecommendations(userId, limit = 20) {
    console_1.default.log("\n==============================");
    console_1.default.log("🚀 FOR YOU RECOMMENDATIONS");
    console_1.default.log("==============================");
    console_1.default.log("👤 User:", userId);
    console_1.default.log("🎯 Limit:", limit);
    /**
     * =====================================
     * 1. USER INTERACTIONS
     * =====================================
     */
    console_1.default.log("\n📌 STEP 1: FETCH USER INTERACTIONS");
    const interactions = await userInteraction_model_1.default.aggregate([
        {
            $match: {
                user: new mongoose_1.default.Types.ObjectId(userId),
                post: { $ne: null },
                type: {
                    $in: ["view", "like", "save", "chat", "purchase"],
                },
            },
        },
        {
            $lookup: {
                from: "posts",
                localField: "post",
                foreignField: "_id",
                as: "postData",
            },
        },
        {
            $unwind: "$postData",
        },
        {
            $match: {
                "postData.status": "active",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                post: 1,
                type: 1,
                score: 1,
                createdAt: 1,
            },
        },
    ]);
    console_1.default.log("✅ Total interactions:", interactions.length);
    if (!interactions.length) {
        console_1.default.log("❄️ Cold start user -> fallback trending");
        return getTrendingGeneral(limit);
    }
    /**
     * =====================================
     * 2. WEIGHT CONFIG
     * =====================================
     */
    const typeWeight = {
        view: 1,
        like: 3,
        save: 4,
        chat: 5,
        purchase: 10,
    };
    console_1.default.log("\n📌 STEP 2: CALCULATE USER PREFERENCES");
    const userItemWeights = new Map();
    const userCategoryWeights = new Map();
    // tối ưu: fetch posts 1 lần
    const postIds = interactions.map((i) => i.post);
    const posts = await post_model_1.default.find({
        _id: { $in: postIds },
    })
        .select("_id category title")
        .lean();
    const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
    for (const inter of interactions) {
        const postId = inter.post?.toString();
        if (!postId)
            continue;
        const decay = timeDecay(inter.createdAt);
        const baseWeight = typeWeight[inter.type] || 1;
        const finalWeight = baseWeight * decay * (inter.score || 1);
        console_1.default.log("\n--------------------------------");
        console_1.default.log("📝 Interaction");
        console_1.default.log("📦 Post:", postId);
        console_1.default.log("👉 Type:", inter.type);
        console_1.default.log("⚖️ Base Weight:", baseWeight);
        console_1.default.log("⏰ Time Decay:", decay);
        console_1.default.log("⭐ Score:", inter.score || 1);
        console_1.default.log("🔥 Final Weight:", finalWeight);
        userItemWeights.set(postId, (userItemWeights.get(postId) || 0) + finalWeight);
        const post = postMap.get(postId);
        if (post) {
            const catId = post.category.toString();
            userCategoryWeights.set(catId, (userCategoryWeights.get(catId) || 0) + finalWeight);
            console_1.default.log("📂 Category:", catId);
            console_1.default.log("📊 Category Weight:", userCategoryWeights.get(catId));
        }
    }
    console_1.default.log("\n✅ USER ITEM WEIGHTS");
    console_1.default.table(Array.from(userItemWeights.entries()).map(([id, score]) => ({
        itemId: id,
        score,
    })));
    console_1.default.log("\n✅ USER CATEGORY WEIGHTS");
    console_1.default.table(Array.from(userCategoryWeights.entries()).map(([id, score]) => ({
        categoryId: id,
        score,
    })));
    const interactedItemIds = new Set(userItemWeights.keys());
    /**
     * =====================================
     * 3. ITEM-ITEM CF
     * =====================================
     */
    console_1.default.log("\n📌 STEP 3: ITEM-BASED CF");
    const candidateScores = new Map();
    const topUserItems = Array.from(userItemWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    console_1.default.log("\n🏆 TOP USER ITEMS");
    console_1.default.table(topUserItems.map(([id, score]) => ({
        itemId: id,
        userWeight: score,
    })));
    for (const [itemId, userWeight] of topUserItems) {
        console_1.default.log("\n================================");
        console_1.default.log("🔍 FIND SIMILAR ITEMS");
        console_1.default.log("📦 Source Item:", itemId);
        console_1.default.log("🔥 User Weight:", userWeight);
        const similarItems = await getSimilarItems(itemId, 0, 30);
        console_1.default.log("✅ Similar Found:", similarItems.length);
        for (const sim of similarItems) {
            if (interactedItemIds.has(sim.id)) {
                console_1.default.log("⛔ Skip interacted:", sim.id);
                continue;
            }
            const contribution = sim.similarity * userWeight;
            console_1.default.log("\n➡️ Similar Item");
            console_1.default.log("📦 Candidate:", sim.id);
            console_1.default.log("📈 Similarity:", sim.similarity);
            console_1.default.log("🔥 Contribution:", contribution);
            candidateScores.set(sim.id, (candidateScores.get(sim.id) || 0) + contribution);
            console_1.default.log("🏁 Total Candidate Score:", candidateScores.get(sim.id));
        }
    }
    console_1.default.log("\n✅ CF CANDIDATES");
    console_1.default.table(Array.from(candidateScores.entries()).map(([id, score]) => ({
        itemId: id,
        score,
    })));
    /**
     * =====================================
     * 4. CONTENT BOOST
     * =====================================
     */
    console_1.default.log("\n📌 STEP 4: CONTENT BOOST");
    const totalCatWeight = Array.from(userCategoryWeights.values()).reduce((a, b) => a + b, 0);
    console_1.default.log("📊 Total Category Weight:", totalCatWeight);
    if (totalCatWeight > 0) {
        const preferredCategories = Array.from(userCategoryWeights.entries())
            .map(([catId, w]) => ({
            catId,
            ratio: w / totalCatWeight,
        }))
            .filter((c) => c.ratio >= 0.05);
        console_1.default.log("\n❤️ Preferred Categories");
        console_1.default.table(preferredCategories);
        const categoryItems = await post_model_1.default.find({
            category: {
                $in: preferredCategories.map((c) => c.catId),
            },
            _id: {
                $nin: Array.from(interactedItemIds),
            },
            status: "active",
        })
            .select("_id category title")
            .limit(limit * 2)
            .lean();
        console_1.default.log("📦 Category Candidate Items:", categoryItems.length);
        for (const item of categoryItems) {
            const catId = item.category.toString();
            const catRatio = preferredCategories.find((c) => c.catId === catId)?.ratio || 0;
            const boost = catRatio * 10;
            candidateScores.set(item._id.toString(), (candidateScores.get(item._id.toString()) || 0) + boost);
            console_1.default.log("\n🚀 Content Boost");
            console_1.default.log("📦 Item:", item._id.toString());
            console_1.default.log("📂 Category:", catId);
            console_1.default.log("📈 Ratio:", catRatio);
            console_1.default.log("🔥 Boost:", boost);
            console_1.default.log("🏁 Final Candidate Score:", candidateScores.get(item._id.toString()));
        }
    }
    /**
     * =====================================
     * 5. TRENDING FALLBACK
     * =====================================
     */
    console_1.default.log("\n📌 STEP 5: TRENDING FALLBACK");
    if (candidateScores.size < limit) {
        console_1.default.log("⚠️ Not enough candidates");
        console_1.default.log("📈 Add trending items");
        const trending = await getTrendingGeneral(limit * 2);
        for (const item of trending) {
            const id = item._id.toString();
            if (!interactedItemIds.has(id) && !candidateScores.has(id)) {
                candidateScores.set(id, (candidateScores.get(id) || 0) + 0.5);
                console_1.default.log("🔥 Trending Added:", id);
            }
        }
    }
    console_1.default.log("\n✅ TOTAL CANDIDATES:", candidateScores.size);
    if (candidateScores.size === 0) {
        console_1.default.log("❌ No candidates -> fallback trending");
        return getTrendingGeneral(limit);
    }
    /**
     * =====================================
     * 6. FINAL RANKING
     * =====================================
     */
    console_1.default.log("\n📌 STEP 6: FINAL RANKING");
    const candidateIds = Array.from(candidateScores.keys());
    const finalPosts = await post_model_1.default.find({
        _id: { $in: candidateIds },
        status: "active",
    }).lean();
    const finalPostMap = new Map(finalPosts.map((p) => [p._id.toString(), p]));
    const results = Array.from(candidateScores.entries())
        .map(([id, rawScore]) => {
        const post = finalPostMap.get(id);
        if (!post)
            return null;
        const catId = post.category.toString();
        const categoryPreference = userCategoryWeights.get(catId) || 0;
        const finalScore = rawScore * (1 + Math.log(1 + categoryPreference) / 10);
        console_1.default.log("\n--------------------------------");
        console_1.default.log("📦 Candidate:", id);
        console_1.default.log("📈 Raw Score:", rawScore);
        console_1.default.log("📂 Category Preference:", categoryPreference);
        console_1.default.log("🏁 Final Score:", finalScore);
        return {
            ...post,
            score: Number(finalScore.toFixed(4)),
            debug: {
                rawScore: Number(rawScore.toFixed(4)),
                categoryPreference,
                method: "hybrid_for_you",
            },
        };
    })
        .filter((item) => item !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    /**
     * =====================================
     * 7. FINAL OUTPUT
     * =====================================
     */
    console_1.default.log("\n==============================");
    console_1.default.log("🏆 FINAL RECOMMENDATIONS");
    console_1.default.log("==============================");
    console_1.default.table(results.map((r, idx) => ({
        rank: idx + 1,
        id: r._id,
        title: r.title,
        score: r.score,
    })));
    console_1.default.log("\n✅ DONE\n");
    return results;
}
// Hàm phụ: lấy trending chung (có thể dùng cache)
async function getTrendingGeneral(limit) {
    // Ví dụ: lấy posts có interaction nhiều nhất trong 7 ngày
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const trending = await userInteraction_model_1.default.aggregate([
        {
            $match: {
                createdAt: { $gte: sevenDaysAgo },
                post: { $ne: null },
                status: "active",
            },
        },
        { $group: { _id: "$post", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: limit },
        // {
        //   $lookup: {
        //     from: "posts",
        //     localField: "_id",
        //     foreignField: "_id",
        //     as: "post",
        //   },
        // },
        // { $unwind: "$post" },
        // { $replaceRoot: { newRoot: "$post" } },
    ]);
    return trending.map((p) => ({
        ...p,
        score: 1,
        debug: { method: "trending" },
    }));
}
async function getSimilarItems(itemId, minSimilarity, limit) {
    const recommendations = await getCollaborativeRecommendations(itemId);
    return recommendations
        .filter((r) => r.score >= minSimilarity)
        .slice(0, limit)
        .map((r) => ({ id: r._id.toString(), similarity: r.score }));
}
const getForYouRecommend = async (req, res) => {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            const trending = await getTrendingGeneral(10);
            return res.json({
                success: true,
                type: "for-you",
                source: "guest",
                data: trending,
            });
        }
        const limit = parseInt(req.query.limit) || 10;
        const cacheKey = recommendation_cache_1.CacheKey.forUser(userId);
        // Thử lấy từ cache
        let data = await (0, recommendation_cache_1.getPrecomputed)(cacheKey);
        // Validate active posts
        if (data?.length) {
            const ids = data.map((x) => x._id);
            const activePosts = await post_model_1.default.find({
                _id: { $in: ids },
                status: "active",
            })
                .select("_id")
                .lean();
            const activeSet = new Set(activePosts.map((x) => x._id.toString()));
            data = data.filter((x) => activeSet.has(x._id.toString()));
        }
        let source = "cache";
        if (!data || data.length < 1) {
            source = "recomputed";
            data = await getForYouRecommendations(userId, limit);
            await (0, recommendation_cache_1.cacheOrFetch)(cacheKey, 120, async () => data);
        }
        return res.json({
            success: true,
            type: "for-you",
            source,
            data,
        });
    }
    catch (error) {
        console_1.default.error("ForYou error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getForYouRecommend = getForYouRecommend;
