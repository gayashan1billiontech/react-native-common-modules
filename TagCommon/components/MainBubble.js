import React, { Fragment, useState, useRef, useEffect } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { free } from '../utils';
import { Bubble } from './Bubble';
import { TileItem } from './TileItem';

let visibleBubbles = new Map();
let textInput = null;
let clickCounter = 0;
let eventListnerRef;
export const MainBubble = (props) => {
  const {
    showIcon,
    mainTitle,
    wrapperStyles,
    wrapperFocusBorderColor,
    inputStyles,
    preSelectedValues = [],
    inputPlaceholder,
    placeholderTextColor,
    bubbleLimit,
    separator,
    onChangeBubbles,
    onTextFocus,
    dropdownHeader,
    highlighterStyles,
    suggestions,
    focusIcon,
    unFocusIcon,
    testID,
    bubbleStyles
  } = props;
  const [focus, setFocus] = useState(false);
  const [invisibleCount, setInvisibleCount] = useState(preSelectedValues.length - 1);
  const [bubbleArray, setBubbleArray] = useState([]);
  const [selectedValues, setSelectedValues] = useState({});
  const [text, setText] = useState('');
  const [suggestionList, setSuggestionList] = useState(suggestions || []);
  const opacity = useRef(new Animated.Value(1)).current;

  const getIcon = (flag) => {
    if (flag) {
      return focusIcon || require('../assets/common/tag-icon-blue.png');
    }
    return unFocusIcon || require('../assets/common/tag-icon.png');
  };

  const handleResponder = (e) => {
    e.stopPropagation();
    return true;
  };

  useEffect(() => {
    if (!eventListnerRef) {
      eventListnerRef = DeviceEventEmitter.addListener('unfocusBubble', unfocus);
    } else if (eventListnerRef) {
      eventListnerRef.remove();
      eventListnerRef = DeviceEventEmitter.addListener('unfocusBubble', unfocus);
    }
    visibleBubbles.clear();
    return () => eventListnerRef.remove();
    //eslint-disable-next-line
  }, []);
  
  useEffect(() => {
    handleInvisibleCount({});
    //eslint-disable-next-line
  }, [bubbleArray]);

  const unfocus = () => {
    handleSetFocus(false);
    Platform.OS !== 'web' && Keyboard.dismiss();
  };

  useEffect(() => {
    if (JSON.stringify(suggestionList) !== JSON.stringify(suggestions)) {
      setSuggestionList(suggestions || []);
    }
    //eslint-disable-next-line
  }, [suggestions]);

  useEffect(() => {
    if (bubbleArray.length !== preSelectedValues.length) {
      const valuesWithoutEmpties = preSelectedValues.filter((e) => e);
      const values = Object.assign({}, selectedValues, ...valuesWithoutEmpties.map((t) => ({ [t]: t })));
      setBubbleArray(valuesWithoutEmpties);
      setSelectedValues({ ...values });
    }
    //eslint-disable-next-line
  }, []);

  const handleInvisibleCount = (data) => {
    const key = Object.keys(data)[0];
    if (key && visibleBubbles.has(key)) {
      const newBubble = { ...data[key], width: visibleBubbles.get(key)?.width ?? data[key].width };
      visibleBubbles.set(key, newBubble);
    } else if (data[key]) {
      visibleBubbles.set(key, data[key]);
    }

    const min = Array.from(visibleBubbles.values()).reduce((acc, cur) => {
      if (acc === 0) {
        return acc + cur.y;
      }
      if (cur.y < acc) {
        acc = cur.y;
        return acc;
      }
      return acc;
    }, 0);
    const count = Array.from(visibleBubbles.values()).reduce((acc, cur) => {
      if (cur.y === min) {
        return ++acc;
      }
      return acc;
    }, 0);
    setInvisibleCount(bubbleArray.length - count);
  };

  const handleOnChangeText = (s) => {
    if (bubbleArray.length === bubbleLimit) return;
    if (s === separator) {
      setText('');
      return;
    }
    if (s.trim()) {
      setText(s);
    } else {
      setTimeout(() => {
        setText('');
      }, 0);
      return;
    }
    if (s.trim()[s.trim().length - 1] === separator) {
      addBubble(s);
    }
  };

  const addBubble = (s, focus) => {
    const pureText = free(s.trim(), separator || '');
    if(!pureText) return;
    if (selectedValues[pureText]) {
      setText(pureText);
      return;
    }
    setText('');
    const updatedArray = [...bubbleArray, pureText];
    setBubbleArray(updatedArray);
    onChangeBubbles?.(updatedArray);
    setSelectedValues({ ...selectedValues, [pureText]: pureText });
    if (focus && textInput) {
      setTimeout(() => {
        textInput.focus();
      }, 100);
    }
  };

  const onKeyPress = (e) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (text === '' && bubbleArray.length > 0) {
        remove(bubbleArray[bubbleArray.length - 1]);
      }
    }
  };

  const remove = (s) => {
    let array = bubbleArray.filter((b) => b !== s);
    setBubbleArray(array);
    onChangeBubbles?.(array);
    visibleBubbles.delete(s);
    const tempSelectedValues = { ...selectedValues };
    tempSelectedValues[s] = undefined;
    setSelectedValues({ ...tempSelectedValues });
  };

  const handleSetFocus = (flag) => {
    onTextFocus?.(flag, textInput);
    opacity.setValue(0);
    setFocus(flag);
    Animated.timing(opacity, {
      toValue: !flag ? 1 : 0,
      duration: clickCounter === 0 ? 400 : 0,
      useNativeDriver: true
    }).start();
    if (textInput && flag) {
      textInput.focus();
    }
    if (flag) {
      clickCounter = 0;
    } else {
      ++clickCounter;
    }
  };

  const filterSuggest = (b) => {
    return b.toLowerCase().includes(text.toLowerCase()) && !Boolean(selectedValues[b]);
  };

  const renderBubbles = () => {
    return bubbleArray.map((bubble, index) => (
      <Fragment key={index}>
        <Bubble text={bubble} bubbleCount={bubbleArray.length} focus={focus} removeBubble={remove} setInvisibleCount={handleInvisibleCount} bubbleStyles={bubbleStyles} />
      </Fragment>
    ));
  };

  return (
    <View testID={testID} style={style.container}>
      <View style={style.flexRow}>
        {showIcon && (
          <View style={style.iconContainer}>
            <Image style={style.icon} source={getIcon(focus)} resizeMode="contain" />
          </View>
        )}
        <View onStartShouldSetResponder={handleResponder}>
          <View>
            {mainTitle && (
              <View style={style.mainTitle}>
                <Text style={style.titleText}>{mainTitle}</Text>
              </View>
            )}
            <View style={[style.mainWrapper, wrapperStyles, Boolean(focus && wrapperFocusBorderColor) && { borderColor: wrapperFocusBorderColor }]}>
              <View
                style={[
                  style.innerContainer,
                  {
                    maxHeight: focus ? undefined : 40,
                    width: !focus && invisibleCount > 0 ? '70%' : '100%'
                  }
                ]}
              >
                {renderBubbles()}
                <View style={[style.inputContainer, Platform.OS === 'web' && style.webInputContainer]}>
                  <TextInput
                    style={[style.input, inputStyles]}
                    placeholder={preSelectedValues.length === 0 ? inputPlaceholder || 'Enter some text...' : ''}
                    placeholderTextColor={placeholderTextColor}
                    allowFontScaling={false}
                    onChangeText={handleOnChangeText}
                    value={text}
                    onKeyPress={onKeyPress}
                    onSubmitEditing={() => addBubble(text, true)}
                    underlineColorAndroid={'transparent'}
                    ref={(ref) => (textInput = ref)}
                    autoFocus={focus}
                    onFocus={() => handleSetFocus(true)}
                    testID="bubble-input"
                    blurOnSubmit={false}
                  />
                </View>
              </View>
              {!focus && invisibleCount > 0 && (
                <Animated.View style={[style.invisibleCount, { opacity }]}>
                  <TouchableOpacity onPress={() => handleSetFocus(true)}>
                    <View style={{ width: 70 }}>
                      <Text style={style.moreText}>+{invisibleCount} More</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
            <View>
              {focus && (
                <View style={[{ position: 'absolute', top: 0, width: '100%', borderColor: '#D6D6D7', backgroundColor: 'white' }]}>
                  <View style={[text !== '' ? { maxHeight: 280 } : { maxHeight: 235 }, { width: '100%' }]}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {text !== '' && dropdownHeader && (
                        <View style={style.suggestion}>
                          <View style={style.flexRow}>
                            <Text style={style.suggestText} allowFontScaling={false}>
                              {dropdownHeader}
                            </Text>
                          </View>
                        </View>
                      )}
                      {suggestionList.filter(filterSuggest).map((s, index) => (
                        <Fragment key={index}>
                          <TouchableOpacity onPress={() => addBubble(s, true)}>
                            <View style={style.suggestDropdown}>
                              <TileItem text={s} selectedValues={selectedValues} pattern={text} highlighterStyles={highlighterStyles} />
                            </View>
                          </TouchableOpacity>
                        </Fragment>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const style = StyleSheet.create({
  container: {
    flexDirection: 'row'
  },
  iconContainer: {
    marginRight: 8
  },
  icon: {
    width: 22,
    height: 22
  },
  mainTitle: {
    backgroundColor: 'white',
    position: 'absolute',
    top: -6,
    left: 10,
    zIndex: 9,
    minWidth: 30
  },
  titleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#404041',
    fontFamily: Platform.OS === 'ios' || Platform.OS === 'android' ? 'Asap' : 'Asap, sans-serif'
  },
  mainWrapper: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: 'white',
    borderColor: '#C4C4C4',
    paddingLeft: 5,
    paddingRight: 10,
    overflow: 'hidden',
    justifyContent: 'center'
  },
  innerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // alignItems: 'center',
    paddingRight: 5
  },
  inputContainer: {
    flex: 1,
    minWidth: 50,
    marginLeft: 5
  },
  webInputContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  input: {
    borderColor: 'transparent',
    width: '100%',
    zIndex: 999999,
    minHeight: 40
  },
  moreText: {
    color: '#787885',
    fontWeight: '500',
    fontSize: 14
  },
  invisibleCount: {
    position: 'absolute',
    right: 5,
    top: '30%'
  },
  suggestion: {
    height: 44,
    justifyContent: 'center',
    paddingLeft: 10,
    backgroundColor: 'white',
    borderColor: '#D6D6D7',
    borderWidth: 1
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  suggestText: {
    fontStyle: 'italic',
    fontWeight: 'bold'
  },
  suggestDropdown: {
    borderColor: '#D6D6D7',
    borderWidth: 1,
    backgroundColor: '#F6FAFF',
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row'
  }
});
