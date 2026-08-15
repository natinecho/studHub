import Post from "../../models/forumModels/postModel.js";
import Comment from "../../models/forumModels/commentModel.js";
import User from "../../models/userModel.js";
import { logActivity } from "../ActivityController.js";

export const createPost = async (req, res) => {
  try {
    const { title, content, tags = [] } = req.body;

    const post = await Post.create({
      user: req.user._id,
      title,
      content,
      tags,
    });

    //for recent acctivity endpoint
    await logActivity({
      user: req.user._id,
      type: "post",
      action: "Created a post",
      title: post.title,
      targetId: post._id,
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: "Failed to create Post", error });
  }
};

export const getPosts = async (req, res) => {
  try {
    const { search = "", favourites, myPosts, page = 1, limit = 10 } = req.query;

    const query = {};

    if (myPosts === "true") {
      query.user = req.user._id;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch posts first
    const posts = await Post.find(query)
      .populate("user", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const postIds = posts.map((p) => p._id);

    // Fetch comment counts in a single query
    const counts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);

    const countMap = counts.reduce((acc, c) => {
      acc[c._id.toString()] = c.count;
      return acc;
    }, {});

    // Fetch user favourites if logged in
    let favSet = new Set();
    if (req.user) {
      const user = await User.findById(req.user._id).select("favourites");
      favSet = new Set(user.favourites.map((id) => id.toString()));
    }

    const postsWithFav = posts.map((post) => ({
      ...post.toObject(),
      isFavourite: favSet.has(post._id.toString()),
      isLiked:
        req.user &&
        post.likes.map((id) => id.toString()).includes(req.user._id.toString()),
      likeCount: post.likes.length,
      commentCount: countMap[post._id.toString()] || 0,
    }));

    // Apply favourites filter after everything
    const filteredPosts =
      favourites === "true"
        ? postsWithFav.filter((post) => post.isFavourite)
        : postsWithFav;

    // Total count for pagination
    const totalCount = await Post.countDocuments(query);

    res.status(200).json({
      posts: filteredPosts,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch posts", error });
  }
};

export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "user",
      "username"
    );

    if (!post) return res.status(404).send({ message: "Post not found" });

    const commentCount = await Comment.countDocuments({ post: post._id });

    // const comments = await Comment.find({ post: post._id })
    //       .populate("user", "username")
    //       .populate("parentComment", "content user") // include parent info
    //       .populate({
    //         path: "parentComment",
    //         populate: { path: "user", select: "username" }, // populate parent user too
    //       })
    //       .sort({ createdAt: 1 });

    let favSet = new Set();
    if (req.user) {
      const user = await User.findById(req.user._id).select("favourites");
      favSet = new Set(user.favourites.map((id) => id.toString()));
    }

    const postsWithFav = {
      ...post.toObject(),
      isFavourite: favSet.has(post._id.toString()),
      isLiked: req.user && post.likes.map((id) => id.toString()).includes(req.user._id.toString()),
      likeCount: post.likes.length,
      commentCount: commentCount,
      // comments: commentCount > 0 ? comments.slice(0,Math.min(commentCount,3)): 0
    };

    return res.status(200).json(postsWithFav);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Post", error });
  }
};

export const updatePost = async (req, res) => {
  try {
    // Whitelist: `req.body` used to be passed through whole, which let a
    // caller rewrite `likes` or hand the post to another `user`.
    const { title, content, tags } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // `findByIdAndUpdate` takes an id, not a filter — passing the owner check
    // as an object made Mongoose try to cast `{_id, user}` as the _id and
    // throw, so every edit came back a 500. The author check belongs in the
    // filter, where a non-owner simply matches nothing.
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).populate("user", "username");

    if (!post) return res.status(404).send({ message: "Post not found" });

    const commentCount = await Comment.countDocuments({ post: post._id });

    let favSet = new Set();
    if (req.user) {
      const user = await User.findById(req.user._id).select("favourites");
      favSet = new Set(user.favourites.map((id) => id.toString()));
    }

    const postsWithFav = {
      ...post.toObject(),
      isFavourite: favSet.has(post._id.toString()),
      isLiked: req.user && post.likes.map((id) => id.toString()).includes(req.user._id.toString()),
      likeCount: post.likes.length,
      commentCount: commentCount,
    };

    //for recent acctivity endpoint
    await logActivity({
      user: req.user._id,
      type: "post",
      action: "Updated a post",
      title: postsWithFav.title,
      targetId: postsWithFav._id,
    });

    return res.status(200).json(postsWithFav);
  } catch (error) {
    res.status(500).json({ message: "Failed to update Post", error });
  }
};

export const deletePost = async (req, res) => {
  try {
    // As in updatePost: this has to be findOneAndDelete, because
    // findByIdAndDelete reads its argument as the id itself. The author check
    // is part of the filter, so someone else's post is simply not found.
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!post) return res.status(404).send({ message: "Post not found" });

    await logActivity({
      user: req.user._id,
      type: "post",
      action: "Deleted a post",
      title: post.title,
      targetId: post._id,
    });


    await Comment.deleteMany({ post: req.params.id });

    res.status(200).json({ message: "Post and related comments deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete Post", error });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById({ _id: req.params.id });

    if (!post) return res.status(404).send({ message: "Post not found" });

    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save(); // <-- make sure to `await` this

    return res.status(200).json({
      message: isLiked ? "Like removed" : "Like added",
      isLiked: !isLiked,
      likeCount: post.likes.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to like Post", error });
  }
};