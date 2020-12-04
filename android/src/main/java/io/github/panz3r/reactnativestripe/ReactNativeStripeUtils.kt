package io.github.panz3r.reactnativestripe

import android.content.res.Resources
import android.graphics.Bitmap
import android.util.Base64
import androidx.core.graphics.drawable.toBitmap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream


fun convertMapToJson(readableMap: ReadableMap?): JSONObject {
    val jsonObject = JSONObject()

    if (readableMap == null) {
        return jsonObject
    }

    val iterator = readableMap.keySetIterator()
    while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        when (readableMap.getType(key)) {
            ReadableType.Array -> jsonObject.put(key, convertArrayToJson(readableMap.getArray(key)))
            ReadableType.Boolean -> jsonObject.put(key, readableMap.getBoolean(key))
            ReadableType.Map -> jsonObject.put(key, convertMapToJson(readableMap.getMap(key)))
            ReadableType.Null -> jsonObject.put(key, JSONObject.NULL)
            ReadableType.Number -> jsonObject.put(key, readableMap.getDouble(key))
            ReadableType.String -> jsonObject.put(key, readableMap.getString(key))
            else -> jsonObject.put(key, JSONObject.NULL)
        }
    }
    return jsonObject
}

fun convertArrayToJson(readableArray: ReadableArray?): JSONArray {
    val jsonArray = JSONArray()

    if (readableArray == null) {
        return jsonArray
    }

    for (idx in 0 until readableArray.size()) {
        when (readableArray.getType(idx)) {
            ReadableType.Array -> jsonArray.put(convertArrayToJson(readableArray.getArray(idx)))
            ReadableType.Boolean -> jsonArray.put(readableArray.getBoolean(idx))
            ReadableType.Map -> jsonArray.put(convertMapToJson(readableArray.getMap(idx)))
            ReadableType.Null -> jsonArray.put(JSONObject.NULL)
            ReadableType.Number -> jsonArray.put(readableArray.getDouble(idx))
            ReadableType.String -> jsonArray.put(readableArray.getString(idx))
            else -> jsonArray.put(JSONObject.NULL)
        }
    }

    return jsonArray
}


fun drawableByIdToBase64(resources: Resources, drawableId: Int?): String {
    drawableId?.let {
        return try {
            val bitmap = resources.getDrawable(it).toBitmap()
            val byteStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteStream)
            val byteArray: ByteArray = byteStream.toByteArray()
            Base64.encodeToString(byteArray, Base64.DEFAULT)
        } catch (err: Exception) {
            ""
        }
    }

    return ""
}

